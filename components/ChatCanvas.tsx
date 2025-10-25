
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { Message, GroundingChunk } from '../types';
import { generateContentStream } from '../services/geminiService';
import { UserIcon, SendIcon, AttachmentIcon, LogoIcon } from './Icons';

const EmptyState: React.FC<{ onPromptClick: (prompt: string) => void }> = ({ onPromptClick }) => {
    const prompts = [
        { icon: "🎨", title: "Design Interface", description: "Create stunning UI designs", prompt: "Design a modern landing page" },
        { icon: "📊", title: "Data Analysis", description: "Get insights from data", prompt: "Analyze my quarterly data" },
        { icon: "✍️", title: "Content Creation", description: "Generate engaging content", prompt: "Write marketing copy for a new tech product" },
        { icon: "⚡", title: "App Development", description: "Create interactive apps", prompt: "Outline the components for a React dashboard" },
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center p-4">
            <div className="text-6xl mb-6 bg-gradient-to-r from-teal-300 to-teal-500 bg-clip-text text-transparent animate-pulse">
                <LogoIcon className="w-16 h-16" />
            </div>
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-teal-300 to-teal-500 bg-clip-text text-transparent">HOPE AI Assistant</h1>
            <p className="text-lg text-text-secondary mb-8">What would you like to build today?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
                {prompts.map(p => (
                    <div key={p.title} onClick={() => onPromptClick(p.prompt)} className="prompt-card bg-[rgba(19,52,59,0.4)] backdrop-blur-[20px] border border-border-subtle rounded-lg p-5 cursor-pointer transition-all duration-200 text-left hover:-translate-y-1 hover:shadow-lg hover:border-primary hover:bg-[rgba(50,184,198,0.1)]">
                        <div className="text-2xl mb-3">{p.icon}</div>
                        <div className="text-base font-medium mb-2 text-text">{p.title}</div>
                        <div className="text-sm text-text-secondary">{p.description}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
    const htmlContent = marked.parse(message.text) as string;
    
    const bubbleClasses = {
        base: 'p-4 rounded-xl border prose prose-invert prose-p:my-0 prose-headings:my-2 prose-a:text-teal-400 hover:prose-a:text-teal-300 prose-pre:bg-charcoal-800 prose-pre:rounded-lg prose-code:text-text-secondary max-w-full text-text',
        user: 'bg-[rgba(94,82,64,0.15)] border-[rgba(94,82,64,0.3)] rounded-br-sm',
        model: 'bg-gradient-to-br from-[rgba(26,62,70,0.5)] to-[rgba(19,52,59,0.3)] backdrop-blur-lg border-border-subtle rounded-bl-sm shadow-lg'
    };

    return (
        <div className={`flex gap-4 animate-[fade-in-up_0.4s_ease-in-out] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-slate-900 ${message.role === 'user' ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gradient-to-br from-teal-300 to-teal-500'}`}>
                {message.role === 'user' ? <UserIcon className="w-6 h-6" /> : <LogoIcon className="w-6 h-6" />}
            </div>
            <div className={`max-w-[70%] flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                    className={`${bubbleClasses.base} ${message.role === 'user' ? bubbleClasses.user : bubbleClasses.model}`}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
                 {message.groundingChunks && message.groundingChunks.length > 0 && (
                    <div className="w-full text-xs text-text-tertiary mt-2">
                        <h4 className="font-semibold mb-1">Sources:</h4>
                        <ul className="list-disc list-inside space-y-1">
                        {message.groundingChunks.map((chunk, index) => {
                             const source = chunk.web || chunk.maps;
                             if (!source || !source.uri) return null;
                             return (
                                <li key={index}>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
                                        {source.title || source.uri}
                                    </a>
                                </li>
                             );
                        })}
                        </ul>
                    </div>
                )}
                <div className="text-xs text-text-tertiary px-2">{message.timestamp}</div>
            </div>
        </div>
    );
};

const TypingIndicator: React.FC = () => (
    <div className="flex gap-4 animate-[fade-in-up_0.4s_ease-in-out]">
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-slate-900 bg-gradient-to-br from-teal-300 to-teal-500">
            <LogoIcon className="w-6 h-6" />
        </div>
        <div className="max-w-[70%] flex flex-col gap-2 items-start">
            <div className="p-4 rounded-xl border bg-[rgba(19,52,59,0.4)] backdrop-blur-lg border-border-subtle flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-[typing_1.4s_infinite] [animation-delay:0s]"></span>
                <span className="w-2 h-2 rounded-full bg-primary animate-[typing_1.4s_infinite] [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-primary animate-[typing_1.4s_infinite] [animation-delay:0.4s]"></span>
                <style>{`
                    @keyframes typing { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-5px); } }
                `}</style>
            </div>
        </div>
    </div>
);


export const ChatCanvas: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            });
        },
        (error) => {
            console.warn("Could not get user location. Maps functionality might be limited.", error);
        }
    );
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };
  
  const sendMessage = useCallback(async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    if(textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    const modelMessageId = (Date.now() + 1).toString();
    const modelMessage: Message = {
        id: modelMessageId,
        role: 'model',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingChunks: [],
    };
    setMessages(prev => [...prev, modelMessage]);

    try {
        const stream = generateContentStream({ prompt: input, location });
        
        for await (const chunk of stream) {
            const chunkText = chunk.text;
            const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;

            setMessages(prev => prev.map(msg => 
                msg.id === modelMessageId 
                    ? { 
                        ...msg, 
                        text: msg.text + chunkText,
                        groundingChunks: groundingMetadata?.groundingChunks as GroundingChunk[] ?? msg.groundingChunks
                      }
                    : msg
            ));
        }
    } catch (error) {
        console.error("Error generating content:", error);
        setMessages(prev => prev.map(msg => 
            msg.id === modelMessageId 
                ? { ...msg, text: "Sorry, I encountered an error. Please try again." }
                : msg
        ));
    } finally {
        setIsLoading(false);
    }
  }, [input, isLoading, location]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePromptClick = (prompt: string) => {
      setInput(prompt);
      textareaRef.current?.focus();
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
        {messages.length === 0 ? <EmptyState onPromptClick={handlePromptClick} /> : (
          <>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            {isLoading && messages[messages.length-1]?.role === 'model' && <div />}
            {isLoading && messages[messages.length-1]?.role !== 'model' && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-border-subtle bg-surface">
        <div className="max-w-4xl mx-auto bg-charcoal-800 border-2 border-border rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 focus-within:border-primary focus-within:shadow-lg">
            <div className="flex items-end gap-3">
                <button className="w-9 h-9 flex-shrink-0 rounded-lg text-lg flex items-center justify-center cursor-pointer transition-colors text-text-secondary hover:bg-[rgba(119,124,124,0.2)] hover:text-text">
                    <AttachmentIcon className="w-5 h-5" />
                </button>
                <textarea
                    ref={textareaRef}
                    className="flex-1 bg-transparent border-none outline-none text-text text-md resize-none max-h-48 overflow-y-auto placeholder:text-text-tertiary"
                    placeholder="Ask HOPE anything..."
                    rows={1}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                />
                <button
                    className="w-12 h-12 flex-shrink-0 rounded-md bg-gradient-to-r from-teal-300 to-teal-500 text-slate-900 text-xl flex items-center justify-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(50,184,198,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    title="Send message"
                >
                   {isLoading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : <SendIcon className="w-5 h-5" />}
                </button>
            </div>
        </div>
        <div className="text-center text-xs text-text-tertiary mt-3">W3J Suite | HOPE AI by W3JDEV (W3J LLC) | Shift+Enter for new line</div>
      </div>
    </>
  );
};
