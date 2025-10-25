import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob as GenAiBlob } from '@google/genai';

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
    // FIX: Changed Uint8_t to Uint8Array as it is the correct type for raw audio data.
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

export const LiveAgentView: React.FC = () => {
    const [connectionState, setConnectionState] = useState<ConnectionState>('IDLE');
    const [transcripts, setTranscripts] = useState<{ user: string; model: string }[]>([]);
    const [currentInterim, setCurrentInterim] = useState({ user: '', model: '' });

    const sessionRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRefs = useRef<{ input?: AudioContext; output?: AudioContext; scriptProcessor?: ScriptProcessorNode, source?: MediaStreamAudioSourceNode }>({});
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

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
            audioContextRefs.current.input.close();
        }
        if (audioContextRefs.current.output) {
            sourcesRef.current.forEach(source => source.stop());
            sourcesRef.current.clear();
            audioContextRefs.current.output.close();
        }
        audioContextRefs.current = {};
        nextStartTimeRef.current = 0;
        setConnectionState('IDLE');
    }, []);
    
    useEffect(() => {
        return () => {
            stopConversation();
        };
    }, [stopConversation]);

    const startConversation = async () => {
        if (connectionState !== 'IDLE' && connectionState !== 'CLOSED' && connectionState !== 'ERROR') return;

        setConnectionState('CONNECTING');
        setTranscripts([]);
        setCurrentInterim({user: '', model: ''});

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
                    systemInstruction: 'You are HOPE, a friendly and helpful AI assistant from W3J.',
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
                            const pcmBlob: GenAiBlob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };

                        source.connect(scriptProcessor);
                        scriptProcessor.connect(audioContextRefs.current.input.destination);
                        audioContextRefs.current.scriptProcessor = scriptProcessor;
                        audioContextRefs.current.source = source;
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcription
                        if (message.serverContent?.inputTranscription) {
                            currentInput += message.serverContent.inputTranscription.text;
                            setCurrentInterim(prev => ({ ...prev, user: currentInput }));
                        }
                         if (message.serverContent?.outputTranscription) {
                            currentOutput += message.serverContent.outputTranscription.text;
                            setCurrentInterim(prev => ({ ...prev, model: currentOutput }));
                        }
                        if(message.serverContent?.turnComplete) {
                            setTranscripts(prev => [...prev, {user: currentInput, model: currentOutput}]);
                            currentInput = '';
                            currentOutput = '';
                            setCurrentInterim({user: '', model: ''});
                        }

                        // Handle audio playback
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && audioContextRefs.current.output) {
                            const outputCtx = audioContextRefs.current.output;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            source.addEventListener('ended', () => sourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                        if(message.serverContent?.interrupted){
                             sourcesRef.current.forEach(source => source.stop());
                             sourcesRef.current.clear();
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
            case 'IDLE':
            case 'CLOSED':
            case 'ERROR':
                return { text: 'Start Conversation', action: startConversation, disabled: false, color: 'bg-teal-500 hover:bg-teal-600' };
            case 'CONNECTING':
                return { text: 'Connecting...', action: () => {}, disabled: true, color: 'bg-gray-500' };
            case 'CONNECTED':
                return { text: 'Stop Conversation', action: stopConversation, disabled: false, color: 'bg-red-500 hover:bg-red-600' };
        }
    };

    const buttonState = getButtonState();

    return (
        <div className="flex flex-col h-full items-center justify-center p-8 bg-charcoal-700 text-text">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-teal-300 to-teal-500 bg-clip-text text-transparent">HOPE Live Agent</h1>
            <p className="text-lg text-text-secondary mb-8">Talk with the W3J AI in real-time.</p>

            <div className="w-full max-w-2xl h-96 bg-surface rounded-lg p-4 overflow-y-auto border border-border-subtle mb-8 flex flex-col space-y-4">
               {transcripts.map((t, i) => (
                   <div key={i}>
                       <p><strong className="text-orange-400">You:</strong> {t.user}</p>
                       <p><strong className="text-teal-300">HOPE:</strong> {t.model}</p>
                   </div>
               ))}
                <div>
                    {currentInterim.user && <p className="text-gray-400"><strong className="text-orange-400">You:</strong> {currentInterim.user}</p>}
                    {currentInterim.model && <p className="text-gray-400"><strong className="text-teal-300">HOPE:</strong> {currentInterim.model}</p>}
                </div>
            </div>

            <button onClick={buttonState.action} disabled={buttonState.disabled} className={`px-8 py-4 text-white font-bold rounded-lg transition-colors ${buttonState.color} disabled:opacity-50 disabled:cursor-not-allowed`}>
                {buttonState.text}
            </button>
             {connectionState === 'CONNECTED' && 
                <div className="mt-4 text-green-400 animate-pulse">
                    Listening...
                </div>
            }
            {connectionState === 'ERROR' && 
                <div className="mt-4 text-red-400">
                    An error occurred. Please try again.
                </div>
            }
        </div>
    );
};