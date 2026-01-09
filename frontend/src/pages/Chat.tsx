import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, AlertTriangle } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export function Chat() {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hello ${user?.email || 'Trader'}! I am TraderMind AI.\n\nI can help you analyze market conditions, explain risks, or answer platform questions.\n\n*Note: I do not execute trades.*`,
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const activeAccount = user?.deriv_accounts?.find(a => a.loginid === user.active_account_id);

            const response = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL}/api/v1/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    role: user?.role === 'ADMIN' ? 'ADMIN' : 'USER',
                    context: `User ID: ${user?.id} | Balance: ${activeAccount?.balance || 0} ${activeAccount?.currency || 'USD'}`
                })
            });

            const data = await response.json();

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || "I'm having trouble connecting to my neural network. Please check if the Ollama server is running.",
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, botMsg]);
        } catch {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Network Error: Unable to reach TraderMind AI.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 p-4 glass-panel rounded-xl border border-primary/20 bg-primary/5">
                <div className="p-3 rounded-full bg-primary/20 border border-primary/30 shadow-[0_0_15px_rgba(var(--color-primary),0.3)]">
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        TraderMind AI Chat
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Active Model: Llama-3-8B (Ollama)
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`p-2 rounded-full shrink-0 ${msg.role === 'user'
                            ? 'bg-accent/20 text-accent border border-accent/30'
                            : 'bg-primary/20 text-primary border border-primary/30'
                            }`}>
                            {msg.role === 'user' ? <UserIcon size={20} /> : <Bot size={20} />}
                        </div>

                        <div className={`
              max-w-[80%] p-4 rounded-2xl backdrop-blur-md border shadow-lg
              ${msg.role === 'user'
                                ? 'bg-accent/10 border-accent/20 text-foreground rounded-tr-none'
                                : 'bg-surface/60 border-white/10 text-foreground rounded-tl-none'
                            }
            `}>
                            <div className="whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/20 text-primary border border-primary/30">
                            <Bot size={20} />
                        </div>
                        <div className="p-4 rounded-2xl bg-surface/40 border border-white/5 rounded-tl-none">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="relative glass-panel rounded-xl p-2 border border-white/10 flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about market conditions, risks, or platform help..."
                    className="flex-1 bg-transparent border-none outline-none px-4 py-3 placeholder:text-muted-foreground/50"
                    disabled={isLoading}
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="p-3 rounded-lg bg-primary text-black font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(var(--color-primary),0.3)] hover:shadow-[0_0_25px_rgba(var(--color-primary),0.5)]"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </div>

            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                <AlertTriangle className="w-3 h-3" />
                TraderMind AI can make mistakes. Consider checking important information.
            </div>
        </div>
    );
}
