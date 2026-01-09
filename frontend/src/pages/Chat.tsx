import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { Send, Bot, User as UserIcon, Loader2, AlertTriangle, MessageSquare } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';

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
            content: `Hello ${user?.email || 'Trader'}.\n\nThis channel is for operational questions and platform guidance.\n\nResponses are informational only and do not execute trades.`,
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

            const data = await fetchWithAuth('/chat', {
                method: 'POST',
                body: JSON.stringify({
                    message: userMsg.content,
                    role: user?.role === 'ADMIN' ? 'ADMIN' : 'USER',
                    context: `User ID: ${user?.id} | Balance: ${activeAccount?.balance || 0} ${activeAccount?.currency || 'USD'}`
                })
            });

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || 'Service is unavailable. Please try again shortly.',
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, botMsg]);
        } catch {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Network error: unable to reach the service.',
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
            <div className="flex items-center gap-3 mb-6 p-4 rounded-lg border border-border bg-card">
                <div className="p-2 rounded-md bg-muted/50 border border-border">
                    <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold">Support chat</h1>
                    <p className="text-sm text-muted-foreground">Operational guidance and platform questions.</p>
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
              max-w-[80%] p-4 rounded-lg border
              ${msg.role === 'user'
                                ? 'bg-muted/40 border-border text-foreground rounded-tr-none'
                                : 'bg-card border-border text-foreground rounded-tl-none'
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
                        <div className="p-4 rounded-lg bg-card border border-border rounded-tl-none">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="relative rounded-lg p-2 border border-border bg-card flex items-center gap-2">
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
                    className="p-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-out"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </div>

            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                <AlertTriangle className="w-3 h-3" />
                Responses are informational and not trading advice.
            </div>
        </div>
    );
}
