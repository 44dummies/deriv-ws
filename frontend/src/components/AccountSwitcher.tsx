import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function AccountSwitcher() {
    const { user, switchAccount } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user || !user.deriv_accounts || user.deriv_accounts.length === 0) {
        return null; // Or a streamlined "Connect Account" button
    }

    const activeAccount = user.deriv_accounts.find(acc => acc.loginid === user.active_account_id);

    const handleSwitch = async (accountId: string) => {
        if (accountId === user.active_account_id) {
            setIsOpen(false);
            return;
        }
        await switchAccount(accountId);
        await useAuthStore.getState().initialize(); // Force refresh to get updated balance/token context
        setIsOpen(false);
        // Optional: Trigger a toast notification or reliance on global state update
        toast.success(`Switched to account ${accountId}`);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    activeAccount?.is_virtual ? "bg-orange-400" : "bg-green-500"
                )} />
                <span className="tabular-nums">
                    {activeAccount?.loginid || 'Select Account'}
                </span>
                <span className="text-muted-foreground ml-1 hidden sm:inline-block">
                    {activeAccount ? `${Number(activeAccount.balance).toFixed(2)} ${activeAccount.currency}` : ''}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        <div className="p-3 border-b border-border/50 bg-muted/30">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Account</h3>
                            {activeAccount && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full ring-2 ring-offset-2 ring-offset-card",
                                            activeAccount.is_virtual ? "bg-orange-400 ring-orange-400/30" : "bg-green-500 ring-green-500/30"
                                        )} />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">{activeAccount.loginid}</span>
                                            <span className="text-[10px] text-muted-foreground">{activeAccount.is_virtual ? 'Demo Account' : 'Real Account'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-mono font-bold text-primary">
                                            {Number(activeAccount.balance).toFixed(2)}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">{activeAccount.currency}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-2 space-y-1">
                            <h3 className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Switch to</h3>
                            {user.deriv_accounts.map((acc) => {
                                const isActive = acc.loginid === user.active_account_id;
                                if (isActive) return null; // Skip active account in list

                                return (
                                    <button
                                        key={acc.loginid}
                                        onClick={() => handleSwitch(acc.loginid)}
                                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-md bg-muted group-hover:bg-background transition-colors">
                                                <Wallet className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium flex items-center gap-2">
                                                    {acc.loginid}
                                                    {acc.is_virtual && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-semibold border border-orange-500/20">DEMO</span>}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                    {Number(acc.balance).toFixed(2)} {acc.currency}
                                                </div>
                                            </div>
                                        </div>
                                        {isActive && <Check className="w-4 h-4 text-primary" />}
                                    </button>
                                );
                            })}

                            {user.deriv_accounts.length === 1 && (
                                <div className="px-3 py-4 text-center text-sm text-muted-foreground italic">
                                    No other accounts linked
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
