import React, { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { Message, GroundingChunk } from '../types';
import { generateContentStream } from '../services/geminiService';
import { UserIcon, LiveIcon, StarLogoIcon } from './Icons';
import { ConstellationLoader } from './LoadingIndicator';

const SchedulerEmptyState: React.FC<{ onPromptClick: (prompt: string) => void }> = ({ onPromptClick }) => {
    const prompts = [
      { icon: "⏰", title: "Set Reminder", description: "Automate reminders for tasks", value: "Remind me about the project deadline on Friday at 5pm" },
      { icon: "📆", title: "Calendar Sync", description: "Keep all events aligned", value: "Sync my work calendar for next week" },
      { icon: "🧭", title: "Smart Scheduling", description: "Find optimal times", value: "Find a 30 minute slot for a meeting with Jane tomorrow afternoon" },
      { icon: "📋", title: "Agenda Builder", description: "Custom daily plans", value: "Build my schedule for Monday with a focus on deep work in the morning" },
    ];
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto text-center p-4">
        <div className="text-8xl mb-6 text-amber-light" style={{ animation: 'float 3s ease-in-out infinite' }}>
            <StarLogoIcon className="w-24 h-24" />
        </div>
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-amber-300 to-white bg-clip-text text-transparent">W3J Scheduler</h1>
        <p className="text-lg text-text-secondary mb-12 max-w-xl">Plan, optimize, and automate your agenda. Never miss an important moment.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full mb-8">
          {prompts.map(p => (
            <div key={p.title} onClick={() => onPromptClick(p.value)} className="prompt-card bg-surface/60 backdrop-blur-xl border border-border-subtle rounded-2xl p-6 cursor-pointer transition-all duration-300 text-left hover:-translate-y-2 hover:shadow-premium hover:border-primary">
              <div className="text-3xl mb-3">{p.icon}</div>
              <h3 className="text-lg font-semibold mb-2 text-text">{p.title}</h3>
              <p className="text-sm text-text-secondary">{p.description}</p>
            </div>
          ))}
        </div>
        
        <div className="flex gap-4 justify-center w-full">
          <button className="px-6 py-3 rounded-lg bg-primary/15 border border-primary/40 text-white font-medium cursor-pointer transition-all flex items-center gap-2 hover:bg-primary/25 hover:-translate-y-0.5 hover:shadow-md"><span>🗓️</span><span>Add Event</span></button>
          <button className="px-6 py-3 rounded-lg bg-primary/15 border border-primary/40 text-white font-medium cursor-pointer transition-all flex items-center gap-2 hover:bg-primary/25 hover:-translate-y-0.5 hover:shadow-md"><span>🔄</span><span>Sync</span></button>
          <button className="px-6 py-3 rounded-lg bg-primary/15 border border-primary/40 text-white font-medium cursor-pointer transition-all flex items-center gap-2 hover:bg-primary/25 hover:-translate-y-0.5 hover:shadow-md"><span>✅</span><span>Checklist</span></button>
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
            <div className={`w-10 h-10 p-2 rounded-full flex-shrink-0 flex items-center justify-center text-white ${message.role === 'user' ? 'bg-gradient-to-br from-rose-400 to-red-500' : 'bg-gradient-to-br from-amber-light to-amber-dark'}`}>
                {message.role === 'user' ? <UserIcon className="w-6 h-6" /> : <StarLogoIcon />}
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
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white p-2 bg-gradient-to-br from-amber-light to-amber-dark">
            <StarLogoIcon />
        </div>
        <div className="max-w-[70%] flex flex-col gap-2 items-start">
             <div className="p-4 rounded-xl border bg-[rgba(19,52,59,0.4)] backdrop-blur-lg border-border-subtle flex items-center justify-center h-[100px] w-[132px]">
                <ConstellationLoader />
            </div>
        </div>
    </div>
);


export const SchedulerView: React.FC = () => {
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
        const schedulerSystemInstruction = "You are HOPE, an AI assistant in the W3J Scheduler app. Your role is to help users manage their schedule. You can set reminders, schedule meetings, sync calendars, and build agendas. Respond as if you have access to the user's calendar and can perform these actions. Be helpful, concise, and confirm the actions you've taken. Use natural language. When a user asks you to schedule something, create a plausible response confirming the event has been scheduled.";
        const stream = generateContentStream({ 
            prompt: input, 
            location, 
            systemInstruction: schedulerSystemInstruction 
        });
        
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
      const textarea = textareaRef.current;
      if (textarea) {
          textarea.focus();
          // We need a timeout to ensure the value is set before we calculate scrollHeight
          setTimeout(() => {
              textarea.style.height = 'auto';
              textarea.style.height = `${textarea.scrollHeight}px`;
          }, 0);
      }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
        {messages.length === 0 ? <SchedulerEmptyState onPromptClick={handlePromptClick} /> : (
          <>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            {isLoading && messages[messages.length-1]?.role === 'model' && <div />}
            {isLoading && messages[messages.length-1]?.role !== 'model' && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-border-subtle bg-surface">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-3 bg-charcoal-800 border border-border rounded-xl p-3 transition-all duration-200 focus-within:border-primary focus-within:shadow-lg">
                <button className="w-10 h-10 flex-shrink-0 rounded-lg text-lg flex items-center justify-center cursor-pointer transition-colors text-text-secondary hover:bg-surface hover:text-text" title="Attach file">
                    <span>📎</span>
                </button>
                <textarea
                    ref={textareaRef}
                    className="flex-1 bg-transparent border-none outline-none text-text text-md resize-none max-h-48 overflow-y-auto placeholder:text-text-secondary"
                    placeholder="Schedule a meeting or set a reminder..."
                    rows={1}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                />
                <button className="w-10 h-10 flex-shrink-0 rounded-lg text-lg flex items-center justify-center cursor-pointer transition-colors text-text-secondary hover:bg-surface hover:text-text" title="Voice input">
                    <LiveIcon className="w-5 h-5"/>
                </button>
                <button
                    className="w-10 h-10 flex-shrink-0 rounded-md bg-gradient-to-r from-teal-300 to-teal-500 text-slate-900 text-xl flex items-center justify-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(50,184,198,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    title="Send message"
                >
                    {isLoading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : <span className="text-2xl">▶</span>}
                </button>
            </div>
            <div className="text-center text-xs text-text-tertiary">Natural language scheduling • Smart conflicts • Auto-sync</div>
        </div>
      </div>
    </>
  );
};