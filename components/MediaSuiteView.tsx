import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AudioFileIcon, ImageFileIcon, UploadIcon, VideoFileIcon, StarLogoIcon } from './Icons';
import * as geminiService from '../services/geminiService';
import { VideosOperationResponse } from '@google/genai';
import { fileToBase64 } from '../utils';
import { ConstellationLoader } from './LoadingIndicator';

type MediaTool = 'image' | 'video' | 'audio';

// --- Helper Components ---

const ToolSelector: React.FC<{ selectedTool: MediaTool; onSelectTool: (tool: MediaTool) => void }> = ({ selectedTool, onSelectTool }) => {
    const tools: { id: MediaTool; icon: React.ReactNode; label: string }[] = [
        { id: 'image', icon: <ImageFileIcon className="w-6 h-6" />, label: 'Image Studio' },
        { id: 'video', icon: <VideoFileIcon className="w-6 h-6" />, label: 'Video Lab' },
        { id: 'audio', icon: <AudioFileIcon className="w-6 h-6" />, label: 'Audio Workshop' },
    ];
    return (
        <div className="flex justify-center gap-4 p-4 bg-surface rounded-xl border border-border-subtle">
            {tools.map(tool => (
                <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-lg transition-all duration-200 ${selectedTool === tool.id ? 'bg-primary text-slate-900 shadow-md' : 'bg-charcoal-800 text-text-secondary hover:bg-charcoal-700 hover:text-text'}`}
                >
                    {tool.icon}
                    <span className="font-semibold">{tool.label}</span>
                </button>
            ))}
        </div>
    );
};

const BackendMessage: React.FC = () => (
    <div className="p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-200 text-sm">
        <strong>Feature Note:</strong> This functionality requires processing large files and is best handled by a backend service. The UI is ready, but a backend integration is needed to enable this feature fully.
    </div>
);

// --- Tool Implementations ---

const ImageStudio: React.FC = () => {
    const [mode, setMode] = useState<'generate' | 'edit'>('generate');
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(selectedFile);
            setResult(null); // Clear previous results
        }
    };

    const handleSubmit = async () => {
        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            if (mode === 'generate') {
                const generatedImage = await geminiService.generateImage(prompt, aspectRatio);
                setResult(generatedImage);
            } else { // edit mode
                if (!file) {
                    setError('Please upload an image to edit.');
                    setIsLoading(false);
                    return;
                }
                const imageBase64 = await fileToBase64(file);
                const isAnalysis = prompt.toLowerCase().includes('analyze') || prompt.toLowerCase().includes('describe');
                
                if (isAnalysis) {
                    const analysisResult = await geminiService.analyzeImage(prompt, imageBase64, file.type);
                    setResult(analysisResult);
                } else {
                    const editedImage = await geminiService.editImage(prompt, imageBase64, file.type);
                    setResult(editedImage);
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(`An error occurred: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-charcoal-800 rounded-lg self-start">
                <button onClick={() => setMode('generate')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'generate' ? 'bg-primary text-slate-900' : 'text-text-secondary hover:bg-surface'}`}>Generate</button>
                <button onClick={() => setMode('edit')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'edit' ? 'bg-primary text-slate-900' : 'text-text-secondary hover:bg-surface'}`}>Edit & Analyze</button>
            </div>

            {mode === 'edit' && (
                <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                    <div className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-text-secondary hover:bg-surface hover:border-primary">
                        {preview ? <img src={preview} alt="Upload preview" className="h-full w-full object-contain" /> : <><UploadIcon className="w-8 h-8 mb-2" /><span>Click to upload image</span></>}
                    </div>
                </div>
            )}
             
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={mode === 'generate' ? "e.g., A robot holding a red skateboard." : "e.g., Add a retro filter, or Analyze this image."} className="w-full p-3 bg-charcoal-800 border border-border rounded-lg focus:outline-none focus:border-primary" rows={3}></textarea>
            
            {mode === 'generate' && (
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Aspect Ratio:</label>
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="bg-charcoal-800 border border-border rounded-lg p-2 focus:outline-none focus:border-primary">
                        <option value="1:1">1:1 (Square)</option>
                        <option value="16:9">16:9 (Landscape)</option>
                        <option value="9:16">9:16 (Portrait)</option>
                        <option value="4:3">4:3</option>
                        <option value="3:4">3:4</option>
                    </select>
                </div>
            )}

            <button onClick={handleSubmit} disabled={isLoading} className="w-full py-3 bg-primary text-slate-900 font-bold rounded-lg disabled:opacity-50 flex items-center justify-center">
                {isLoading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : 'Generate'}
            </button>

            {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg">{error}</div>}
            
            {result && (
                <div className="mt-6">
                    <h3 className="font-semibold mb-2">Result:</h3>
                    {result.startsWith('data:image') ?
                        <img src={result} alt="Generated result" className="rounded-lg border border-border-subtle" /> :
                        <div className="p-4 bg-surface rounded-lg whitespace-pre-wrap">{result}</div>
                    }
                </div>
            )}
        </div>
    );
};

const VideoLab: React.FC<{ apiKeySelected: boolean, onSelectKey: () => void }> = ({ apiKeySelected, onSelectKey }) => {
    const [mode, setMode] = useState<'generate' | 'analyze'>('generate');
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(selectedFile);
            setResultUrl(null);
        }
    };
    
    const handleSubmit = async () => {
        if (!prompt && !file) {
            setError('Please enter a prompt or upload an image.');
            return;
        }
        if (!apiKeySelected) {
            onSelectKey();
            return;
        }
        setIsLoading(true);
        setError(null);
        setResultUrl(null);
        setLoadingMessage('Initializing video generation...');

        try {
            let startImage;
            if (file) {
                startImage = { base64: await fileToBase64(file), mimeType: file.type };
            }

            let operation = await geminiService.generateVideo(prompt, aspectRatio, startImage);
            setLoadingMessage('Video is generating. This may take a few minutes...');
            
            const finalOperation = await geminiService.pollVideoOperation(operation);
            setLoadingMessage('Finalizing video...');

            const downloadLink = finalOperation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                 // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                const blob = await response.blob();
                setResultUrl(URL.createObjectURL(blob));
            } else {
                throw new Error('Video generation finished, but no download link was found.');
            }

        } catch (err: any) {
            console.error(err);
            if (err.message.includes("Requested entity was not found")) {
                setError(`An error occurred. Your API key might be invalid. Please try selecting a different key.`);
                onSelectKey(); // Prompt user to re-select
            } else {
                setError(`An error occurred: ${err.message}`);
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    if (!apiKeySelected) {
        return (
             <div className="p-4 bg-blue-900/50 border border-blue-700 rounded-lg text-blue-200 text-sm flex flex-col items-center gap-4">
                <p>Video generation with Veo requires you to select an API key. This is a one-time step.</p>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">Learn about billing</a>
                <button onClick={onSelectKey} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg">Select API Key</button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-charcoal-800 rounded-lg self-start">
                <button onClick={() => setMode('generate')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'generate' ? 'bg-primary text-slate-900' : 'text-text-secondary hover:bg-surface'}`}>Generate</button>
                <button onClick={() => setMode('analyze')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'analyze' ? 'bg-primary text-slate-900' : 'text-text-secondary hover:bg-surface'}`}>Analyze</button>
            </div>

            {mode === 'analyze' ? <BackendMessage /> : (
                <>
                    <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                        <div className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-text-secondary hover:bg-surface hover:border-primary">
                            {preview ? <img src={preview} alt="Upload preview" className="h-full w-full object-contain" /> : <><UploadIcon className="w-8 h-8 mb-2" /><span>Add optional start image</span></>}
                        </div>
                    </div>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., A neon hologram of a cat driving at top speed" className="w-full p-3 bg-charcoal-800 border border-border rounded-lg focus:outline-none focus:border-primary" rows={3}></textarea>
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium">Aspect Ratio:</label>
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="bg-charcoal-800 border border-border rounded-lg p-2 focus:outline-none focus:border-primary">
                            <option value="16:9">16:9 (Landscape)</option>
                            <option value="9:16">9:16 (Portrait)</option>
                        </select>
                    </div>
                    <button onClick={handleSubmit} disabled={isLoading} className="w-full py-3 bg-primary text-slate-900 font-bold rounded-lg disabled:opacity-50 flex items-center justify-center">
                        {isLoading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : 'Generate Video'}
                    </button>
                    {isLoading && (
                        <div className="flex flex-col items-center gap-4 text-center text-sm text-text-secondary">
                            <div className="w-[132px] h-[100px] flex items-center justify-center">
                                <ConstellationLoader />
                            </div>
                            <span>{loadingMessage}</span>
                        </div>
                    )}
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg">{error}</div>}
                    {resultUrl && (
                        <div className="mt-6">
                            <h3 className="font-semibold mb-2">Result:</h3>
                            <video src={resultUrl} controls className="w-full rounded-lg border border-border-subtle"></video>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const AudioWorkshop: React.FC = () => {
    const [mode, setMode] = useState<'tts' | 'transcribe'>('tts');
    const [text, setText] = useState('');
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!text) {
            setError('Please enter some text to generate speech.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResultUrl(null);
        
        try {
            const audioUrl = await geminiService.generateSpeech(text);
            setResultUrl(audioUrl);
        } catch(err: any) {
            console.error(err);
            setError(`An error occurred: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
             <div className="flex gap-2 p-1 bg-charcoal-800 rounded-lg self-start">
                <button onClick={() => setMode('tts')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'tts' ? 'bg-primary text-slate-900' : 'text-text-secondary hover:bg-surface'}`}>Text-to-Speech</button>
                <button onClick={() => setMode('transcribe')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'transcribe' ? 'bg-primary text-slate-900' : 'text-text-secondary hover:bg-surface'}`}>Transcribe</button>
            </div>
            {mode === 'transcribe' ? <BackendMessage /> : (
                 <>
                    <textarea value={text} onChange={e => setText(e.target.value)} placeholder="e.g., Say cheerfully: Have a wonderful day!" className="w-full p-3 bg-charcoal-800 border border-border rounded-lg focus:outline-none focus:border-primary" rows={4}></textarea>
                    <button onClick={handleSubmit} disabled={isLoading} className="w-full py-3 bg-primary text-slate-900 font-bold rounded-lg disabled:opacity-50 flex items-center justify-center">
                       {isLoading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : 'Generate Speech'}
                    </button>
                    {error && <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg">{error}</div>}
                    {resultUrl && (
                        <div className="mt-6">
                            <h3 className="font-semibold mb-2">Result:</h3>
                            <audio src={resultUrl} controls className="w-full"></audio>
                        </div>
                    )}
                 </>
            )}
        </div>
    );
};

export const MediaSuiteView: React.FC = () => {
    const [selectedTool, setSelectedTool] = useState<MediaTool>('image');
    const [hasApiKey, setHasApiKey] = useState(false);
    const [isCheckingKey, setIsCheckingKey] = useState(true);
    
    const checkApiKey = useCallback(async () => {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            setIsCheckingKey(true);
            const keyStatus = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(keyStatus);
            setIsCheckingKey(false);
        } else {
            // Fallback for when the aistudio object is not available
            setHasApiKey(false);
            setIsCheckingKey(false);
        }
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    const openSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            // Assume selection was successful and re-check.
            // A small delay helps mitigate potential race conditions.
            setTimeout(checkApiKey, 500);
        }
    };
    
    const renderTool = () => {
        if (isCheckingKey) {
            return <div className="text-center p-8">Checking API key status...</div>
        }
        switch (selectedTool) {
            case 'image':
                return <ImageStudio />;
            case 'video':
                return <VideoLab apiKeySelected={hasApiKey} onSelectKey={openSelectKey} />;
            case 'audio':
                return <AudioWorkshop />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto p-8 gap-8">
            <header className="text-center">
                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-emerald-light to-teal-400 bg-clip-text text-transparent inline-flex items-center gap-4">
                    <div className="relative inline-block">
                        <StarLogoIcon className="w-10 h-10 text-emerald" />
                        <div className="absolute inset-0 animate-shimmer"></div>
                    </div>
                    <span>W3J Media Suite</span>
                </h1>
                <p className="text-lg text-text-secondary">Generate and manipulate rich media with the power of AI.</p>
            </header>
            <ToolSelector selectedTool={selectedTool} onSelectTool={setSelectedTool} />
            <div className="bg-surface p-6 rounded-xl border border-border-subtle max-w-2xl w-full mx-auto">
                {renderTool()}
            </div>
        </div>
    );
};