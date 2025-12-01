import React, { useState, useMemo } from 'react';
import { 
  Search, Star, ChevronDown, ChevronRight, 
  TrendingUp, Coins, Gem, Bitcoin, BarChart3,
  X, Menu
} from 'lucide-react';
import { useTradingStore } from '../../store/tradingStore';
import { ActiveSymbol } from '../../services/websocketService';

interface MarketGroup {
  market: string;
  market_display_name: string;
  submarkets: {
    submarket: string;
    submarket_display_name: string;
    symbols: ActiveSymbol[];
  }[];
}

const marketIcons: { [key: string]: React.ReactNode } = {
  forex: <TrendingUp className="w-4 h-4" />,
  synthetic_index: <BarChart3 className="w-4 h-4" />,
  indices: <BarChart3 className="w-4 h-4" />,
  commodities: <Gem className="w-4 h-4" />,
  cryptocurrency: <Bitcoin className="w-4 h-4" />,
  basket_index: <Coins className="w-4 h-4" />,
};

const marketColors: { [key: string]: string } = {
  forex: 'text-blue-400',
  synthetic_index: 'text-purple-400',
  indices: 'text-green-400',
  commodities: 'text-yellow-400',
  cryptocurrency: 'text-orange-400',
  basket_index: 'text-pink-400',
};

const MarketSidebar: React.FC = () => {
  const { 
    activeSymbols, 
    selectedSymbol, 
    setSelectedSymbol,
    favorites,
    toggleFavorite,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useTradingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMarkets, setExpandedMarkets] = useState<string[]>(['synthetic_index']);
  const [expandedSubmarkets, setExpandedSubmarkets] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Group symbols by market and submarket
  const groupedSymbols = useMemo(() => {
    const groups: MarketGroup[] = [];
    const marketMap = new Map<string, MarketGroup>();

    let symbolsToShow = activeSymbols;
    
    // Filter by favorites
    if (showFavoritesOnly) {
      symbolsToShow = symbolsToShow.filter(s => favorites.includes(s.symbol));
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      symbolsToShow = symbolsToShow.filter(s => 
        s.display_name.toLowerCase().includes(query) ||
        s.symbol.toLowerCase().includes(query)
      );
    }

    symbolsToShow.forEach(symbol => {
      if (!marketMap.has(symbol.market)) {
        const group: MarketGroup = {
          market: symbol.market,
          market_display_name: symbol.market_display_name,
          submarkets: [],
        };
        marketMap.set(symbol.market, group);
        groups.push(group);
      }

      const marketGroup = marketMap.get(symbol.market)!;
      let submarket = marketGroup.submarkets.find(s => s.submarket === symbol.submarket);
      
      if (!submarket) {
        submarket = {
          submarket: symbol.submarket,
          submarket_display_name: symbol.submarket_display_name,
          symbols: [],
        };
        marketGroup.submarkets.push(submarket);
      }

      submarket.symbols.push(symbol);
    });

    return groups;
  }, [activeSymbols, searchQuery, showFavoritesOnly, favorites]);

  const toggleMarket = (market: string) => {
    setExpandedMarkets(prev => 
      prev.includes(market) 
        ? prev.filter(m => m !== market)
        : [...prev, market]
    );
  };

  const toggleSubmarket = (submarket: string) => {
    setExpandedSubmarkets(prev => 
      prev.includes(submarket) 
        ? prev.filter(s => s !== submarket)
        : [...prev, submarket]
    );
  };

  if (sidebarCollapsed) {
    return (
      <div className="w-12 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4">
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Markets</h2>
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-deriv-red"
          />
        </div>

        {/* Favorites Toggle */}
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showFavoritesOnly 
              ? 'bg-yellow-500/20 text-yellow-400' 
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-yellow-400' : ''}`} />
          Favorites ({favorites.length})
        </button>
      </div>

      {/* Markets List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {groupedSymbols.map(marketGroup => (
          <div key={marketGroup.market} className="border-b border-gray-800">
            {/* Market Header */}
            <button
              onClick={() => toggleMarket(marketGroup.market)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
            >
              <span className={marketColors[marketGroup.market] || 'text-gray-400'}>
                {marketIcons[marketGroup.market] || <BarChart3 className="w-4 h-4" />}
              </span>
              <span className="flex-1 text-left text-sm font-medium text-white">
                {marketGroup.market_display_name}
              </span>
              <span className="text-xs text-gray-500">
                {marketGroup.submarkets.reduce((acc, sm) => acc + sm.symbols.length, 0)}
              </span>
              {expandedMarkets.includes(marketGroup.market) 
                ? <ChevronDown className="w-4 h-4 text-gray-500" />
                : <ChevronRight className="w-4 h-4 text-gray-500" />
              }
            </button>

            {/* Submarkets */}
            {expandedMarkets.includes(marketGroup.market) && (
              <div className="bg-gray-800/30">
                {marketGroup.submarkets.map(submarket => (
                  <div key={submarket.submarket}>
                    {/* Submarket Header */}
                    <button
                      onClick={() => toggleSubmarket(submarket.submarket)}
                      className="w-full flex items-center gap-2 px-6 py-2 hover:bg-gray-800/50 transition-colors"
                    >
                      {expandedSubmarkets.includes(submarket.submarket) 
                        ? <ChevronDown className="w-3 h-3 text-gray-500" />
                        : <ChevronRight className="w-3 h-3 text-gray-500" />
                      }
                      <span className="flex-1 text-left text-xs text-gray-400">
                        {submarket.submarket_display_name}
                      </span>
                      <span className="text-xs text-gray-600">
                        {submarket.symbols.length}
                      </span>
                    </button>

                    {/* Symbols */}
                    {expandedSubmarkets.includes(submarket.submarket) && (
                      <div className="pb-2">
                        {submarket.symbols.map(symbol => (
                          <div
                            key={symbol.symbol}
                            onClick={() => setSelectedSymbol(symbol)}
                            className={`flex items-center gap-2 px-8 py-2 cursor-pointer transition-colors ${
                              selectedSymbol?.symbol === symbol.symbol
                                ? 'bg-deriv-red/20 border-l-2 border-deriv-red'
                                : 'hover:bg-gray-800/50'
                            }`}
                          >
                            {/* Status Dot */}
                            <span className={`w-2 h-2 rounded-full ${
                              symbol.exchange_is_open && !symbol.is_trading_suspended
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }`} />
                            
                            {/* Symbol Name */}
                            <span className="flex-1 text-sm text-gray-300 truncate">
                              {symbol.display_name}
                            </span>
                            
                            {/* Favorite Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(symbol.symbol);
                              }}
                              className="p-1 hover:bg-gray-700 rounded transition-colors"
                            >
                              <Star 
                                className={`w-3.5 h-3.5 ${
                                  favorites.includes(symbol.symbol)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-600'
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {groupedSymbols.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? 'No markets found' : 'Loading markets...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketSidebar;
