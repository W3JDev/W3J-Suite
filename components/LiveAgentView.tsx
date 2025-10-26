import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob as GenAiBlob } from '@google/genai';
import { StarLogoIcon } from './Icons';
import { AudioVisualizer } from './AudioVisualizer';

// Base64 encoding/decoding functions
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


type ConnectionState = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR' | 'CLOSED';
type Transcript = { id: number; author: 'user' | 'model'; text: string };

export const LiveAgentView: React.FC = () => {
    const [connectionState, setConnectionState] = useState<ConnectionState>('IDLE');
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [activeSources, setActiveSources] = useState(new Set<AudioBufferSourceNode>());

    const sessionRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRefs = useRef<{ input?: AudioContext; output?: AudioContext; scriptProcessor?: ScriptProcessorNode, source?: MediaStreamAudioSourceNode }>({});
    const nextStartTimeRef = useRef(0);
    const isSpeaking = activeSources.size > 0;

    const stopConversation = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.then(session => session.close());
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRefs.current.input) {
            audioContextRefs.current.scriptProcessor?.disconnect();
            audioContextRefs.current.source?.disconnect();
            audioContextRefs.current.input.close().catch(console.error);
        }
        if (audioContextRefs.current.output) {
            activeSources.forEach(source => source.stop());
            setActiveSources(new Set());
            audioContextRefs.current.output.close().catch(console.error);
        }
        audioContextRefs.current = {};
        nextStartTimeRef.current = 0;
        setConnectionState('IDLE');
    }, [activeSources]);
    
    useEffect(() => {
        return () => {
            stopConversation();
        };
    }, [stopConversation]);

    const startConversation = async () => {
        if (connectionState !== 'IDLE' && connectionState !== 'CLOSED' && connectionState !== 'ERROR') return;

        setConnectionState('CONNECTING');
        setTranscripts([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            audioContextRefs.current.output = new (window.AudioContext)({ sampleRate: 24000 });
            
            let currentInput = '';
            let currentOutput = '';
            
            sessionRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: 'You are HOPE, a friendly and helpful AI assistant from W3J. Keep your responses concise and conversational.',
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        setConnectionState('CONNECTED');
                        audioContextRefs.current.input = new (window.AudioContext)({ sampleRate: 16000 });
                        const source = audioContextRefs.current.input.createMediaStreamSource(stream);
                        const scriptProcessor = audioContextRefs.current.input.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob: GenAiBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                            sessionRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };

                        source.connect(scriptProcessor);
                        scriptProcessor.connect(audioContextRefs.current.input.destination);
                        audioContextRefs.current.scriptProcessor = scriptProcessor;
                        audioContextRefs.current.source = source;
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) currentInput += message.serverContent.inputTranscription.text;
                        if (message.serverContent?.outputTranscription) currentOutput += message.serverContent.outputTranscription.text;
                        
                        if(message.serverContent?.turnComplete) {
                            setTranscripts(prev => [
                                ...prev, 
                                { id: Date.now(), author: 'user', text: currentInput },
                                { id: Date.now() + 1, author: 'model', text: currentOutput }
                            ]);
                            currentInput = '';
                            currentOutput = '';
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && audioContextRefs.current.output) {
                            const outputCtx = audioContextRefs.current.output;
                            // FIX: Resume AudioContext if it's suspended to comply with browser autoplay policies.
                            if (outputCtx.state === 'suspended') {
                                outputCtx.resume();
                            }
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            source.addEventListener('ended', () => {
                                setActiveSources(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(source);
                                    return newSet;
                                });
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            setActiveSources(prev => new Set(prev).add(source));
                        }
                        if(message.serverContent?.interrupted){
                             activeSources.forEach(source => source.stop());
                             setActiveSources(new Set());
                             nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live API Error:', e);
                        setConnectionState('ERROR');
                        stopConversation();
                    },
                    onclose: () => {
                        setConnectionState('CLOSED');
                        stopConversation();
                    },
                },
            });

        } catch (error) {
            console.error("Failed to start conversation:", error);
            setConnectionState('ERROR');
        }
    };

    const getButtonState = () => {
        switch (connectionState) {
            case 'IDLE': case 'CLOSED': case 'ERROR':
                return { text: 'Start Conversation', action: startConversation, disabled: false, color: 'bg-primary hover:bg-primary-hover' };
            case 'CONNECTING':
                return { text: 'Connecting...', action: () => {}, disabled: true, color: 'bg-slate-500' };
            case 'CONNECTED':
                return { text: 'Stop Conversation', action: stopConversation, disabled: false, color: 'bg-red-500 hover:bg-red-600' };
        }
    };
    const buttonState = getButtonState();

    return (
        <div className="flex flex-col h-full bg-charcoal-700 text-text">
            {/* Transcript Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <h1 className="text-2xl font-bold mb-3 text-text-secondary text-center">Conversation Transcript</h1>
                {transcripts.length === 0 && (
                    <div className="text-center text-text-tertiary">
                        <p>Press "Start Conversation" to begin.</p>
                    </div>
                )}
                {transcripts.map((t) => (
                    <div key={t.id} className={`flex items-start gap-3 ${t.author === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white ${t.author === 'user' ? 'bg-orange-400' : 'bg-amethyst'}`}>
                            {t.author === 'user' ? 'U' : <StarLogoIcon className="w-5 h-5" />}
                        </div>
                        <p className={`p-3 rounded-lg max-w-lg ${t.author === 'user' ? 'bg-surface' : 'bg-charcoal-800'}`}>{t.text}</p>
                    </div>
                ))}
            </div>

            {/* Visualizer Area */}
            <div className="flex flex-col items-center justify-center p-8 gap-8 border-t border-b border-border-subtle bg-surface/50">
                <div className={`relative transition-all duration-300 ${isSpeaking ? 'scale-110' : 'scale-100'}`}>
                    <StarLogoIcon 
                        className={`w-24 h-24 text-amethyst transition-all duration-300`} 
                        style={{ animation: isSpeaking ? 'glow 2s infinite ease-in-out' : 'none' }} 
                    />
                </div>
                <div className="w-full max-w-md h-20">
                    <AudioVisualizer stream={mediaStreamRef.current} isActive={connectionState === 'CONNECTED' && !isSpeaking} />
                </div>
            </div>

            {/* Controls Area */}
            <div className="p-6 flex flex-col items-center justify-center gap-4">
                <button onClick={buttonState.action} disabled={buttonState.disabled} className={`px-8 py-4 text-white font-bold rounded-lg transition-all duration-200 ${buttonState.color} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    {buttonState.text}
                </button>
                <div className="h-5 text-sm">
                    {connectionState === 'CONNECTING' && <p className="text-yellow-400 animate-pulse">Connecting...</p>}
                    {connectionState === 'CONNECTED' && <p className="text-green-400 animate-pulse">{isSpeaking ? 'HOPE is speaking...' : 'Listening...'}</p>}
                    {connectionState === 'ERROR' && <p className="text-red-400">An error occurred. Please try again.</p>}
                    {connectionState === 'CLOSED' && <p className="text-text-secondary">Conversation ended.</p>}
                </div>
            </div>
        </div>
    );
};