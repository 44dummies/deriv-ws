
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Activity, Zap, TrendingUp, Filter } from 'lucide-react';
import { GlassCard } from './glass/GlassCard';
import { GlassButton } from './glass/GlassButton';

interface Market {
    id: string;
    name: string;
    description?: string;
    category: 'volatility' | 'jump' | 'forex';
    volatility?: number;
}

const MARKETS: Market[] = [
    { id: '1HZ100V', name: 'Volatility 100 (1s) Index', category: 'volatility', volatility: 100 },
    { id: '1HZ75V', name: 'Volatility 75 (1s) Index', category: 'volatility', volatility: 75 },
    { id: '1HZ50V', name: 'Volatility 50 (1s) Index', category: 'volatility', volatility: 50 },
    { id: '1HZ25V', name: 'Volatility 25 (1s) Index', category: 'volatility', volatility: 25 },
    { id: '1HZ10V', name: 'Volatility 10 (1s) Index', category: 'volatility', volatility: 10 },
    { id: 'JD100', name: 'Jump 100 Index', category: 'jump' },
    { id: 'JD75', name: 'Jump 75 Index', category: 'jump' },
    { id: 'JD50', name: 'Jump 50 Index', category: 'jump' },
    { id: 'JD25', name: 'Jump 25 Index', category: 'jump' },
    { id: 'JD10', name: 'Jump 10 Index', category: 'jump' },
];

interface MarketSelectorProps {
    onSelect: (market: Market) => void;
    currentMarketId?: string;
    className?: string;
}

export const MarketSelector: React.FC<MarketSelectorProps> = ({ onSelect, currentMarketId, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'volatility' | 'jump'>('all');
    const containerRef = useRef<HTMLDivElement>(null);

    const currentMarket = MARKETS.find(m => m.id === currentMarketId) || MARKETS[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredMarkets = MARKETS.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || m.category === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 flex items-center justify-between hover:bg-white/10 transition-all duration-300 group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-red/10 text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all duration-300">
                        <Zap size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Trading Market</p>
                        <p className="font-bold text-white whitespace-nowrap">{currentMarket.name}</p>
                    </div>
                </div>
                <ChevronDown className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={20} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <GlassCard className="border-white/10 shadow-2xl overflow-hidden p-0 max-h-[450px] flex flex-col">
                        {/* Header / Search */}
                        <div className="p-4 bg-white/5 border-b border-white/5">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search markets..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-red/30 transition-all"
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2">
                                {['all', 'volatility', 'jump'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f as any)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter === f
                                                ? 'bg-brand-red text-white'
                                                : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filteredMarkets.length === 0 ? (
                                <div className="p-10 text-center">
                                    <Filter className="mx-auto text-gray-700 mb-2" size={32} />
                                    <p className="text-gray-500 text-sm">No markets found</p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {filteredMarkets.map((market) => (
                                        <button
                                            key={market.id}
                                            onClick={() => {
                                                onSelect(market);
                                                setIsOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${currentMarketId === market.id
                                                    ? 'bg-brand-red/10 border border-brand-red/20'
                                                    : 'hover:bg-white/5 border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${currentMarketId === market.id ? 'text-brand-red' : 'text-gray-500 group-hover:text-white'
                                                    }`}>
                                                    <TrendingUp size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className={`font-bold text-sm ${currentMarketId === market.id ? 'text-white' : 'text-gray-300'}`}>
                                                        {market.id}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{market.name}</p>
                                                </div>
                                            </div>
                                            {market.volatility && (
                                                <span className="text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-0.5 rounded uppercase">
                                                    {market.volatility}% Vol
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-white/5 border-t border-white/5 text-center">
                            <p className="text-[10px] text-gray-600 font-medium">REAL-TIME LIQUIDITY PROVIDER: DERIV API</p>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};
