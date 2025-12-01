import React, { useEffect, useState, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, X, 
  RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { useTradingStore } from '../../store/tradingStore';
import websocketService from '../../services/websocketService';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const OpenPositions: React.FC = () => {
  const { openContracts, setOpenContracts, updateOpenContract, removeOpenContract, currency } = useTradingStore();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedContract, setExpandedContract] = useState<number | null>(null);
  const [sellingContract, setSellingContract] = useState<number | null>(null);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      signDisplay: 'exceptZero',
    }).format(value);
  }, [currency]);

  useEffect(() => {
    const loadPositions = async () => {
      try {
        // Get portfolio
        const portfolioResponse = await websocketService.getOpenContracts();
        
        if (portfolioResponse.portfolio?.contracts) {
          // Subscribe to each open contract for live updates
          const contractPromises = portfolioResponse.portfolio.contracts.map(async (c: any) => {
            const contractResponse = await websocketService.getContractInfo(c.contract_id);
            return contractResponse.proposal_open_contract;
          });
          
          const contracts = await Promise.all(contractPromises);
          setOpenContracts(contracts.filter(Boolean));

          // Subscribe to all open contracts
          await websocketService.subscribeAllOpenContracts((data) => {
            if (data.proposal_open_contract) {
              const contract = data.proposal_open_contract;
              if (contract.is_sold || contract.is_expired) {
                removeOpenContract(contract.contract_id);
                
                // Show notification
                const profit = contract.profit;
                if (profit >= 0) {
                  toast.success(`Contract closed with profit: +${formatCurrency(profit)}`);
                } else {
                  toast.error(`Contract closed with loss: ${formatCurrency(profit)}`);
                }
              } else {
                updateOpenContract(contract);
              }
            }
          });
        }
      } catch (error) {
        console.error('Error loading positions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPositions();
  }, [setOpenContracts, removeOpenContract, updateOpenContract, formatCurrency]);

  const handleSell = async (contractId: number, price: number) => {
    setSellingContract(contractId);
    try {
      await websocketService.sell(contractId, price);
      toast.success('Contract sold successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sell contract');
    } finally {
      setSellingContract(null);
    }
  };

  const getTimeRemaining = (expiryTime: number) => {
    const now = Date.now() / 1000;
    const remaining = expiryTime - now;
    
    if (remaining <= 0) return 'Expired';
    if (remaining < 60) return `${Math.floor(remaining)}s`;
    if (remaining < 3600) return `${Math.floor(remaining / 60)}m ${Math.floor(remaining % 60)}s`;
    return formatDistanceToNow(new Date(expiryTime * 1000), { addSuffix: false });
  };

  const getContractTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      CALL: 'Rise',
      PUT: 'Fall',
      CALLE: 'Higher',
      PUTE: 'Lower',
      DIGITMATCH: 'Matches',
      DIGITDIFF: 'Differs',
    };
    return types[type] || type;
  };

  const totalProfit = openContracts.reduce((sum, c) => sum + (c.profit || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="w-6 h-6 text-deriv-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">Open Positions</h3>
          <span className="px-2 py-0.5 bg-gray-800 rounded-full text-xs text-gray-400">
            {openContracts.length}
          </span>
        </div>
        <div className={`text-sm font-medium ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          Total P/L: {formatCurrency(totalProfit)}
        </div>
      </div>

      {/* Positions List */}
      <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
        {openContracts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No open positions
          </div>
        ) : (
          openContracts.map((contract) => (
            <div key={contract.contract_id} className="bg-transparent hover:bg-white/5 transition-colors">
              {/* Main Row */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setExpandedContract(
                  expandedContract === contract.contract_id ? null : contract.contract_id
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {/* Contract Type Icon */}
                    <div className={`p-2 rounded-lg ${
                      contract.contract_type === 'CALL' || contract.contract_type === 'CALLE'
                        ? 'bg-green-500/20'
                        : 'bg-red-500/20'
                    }`}>
                      {contract.contract_type === 'CALL' || contract.contract_type === 'CALLE' ? (
                        <TrendingUp className={`w-4 h-4 text-green-400`} />
                      ) : (
                        <TrendingDown className={`w-4 h-4 text-red-400`} />
                      )}
                    </div>
                    
                    {/* Symbol & Type */}
                    <div>
                      <p className="font-medium text-white">{contract.display_name}</p>
                      <p className="text-xs text-gray-500">
                        {getContractTypeLabel(contract.contract_type)}
                      </p>
                    </div>
                  </div>

                  {/* P/L */}
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      contract.profit >= 0 ? 'text-green-400' : 'text-red-400'
                    } ${contract.profit !== 0 ? 'animate-pulse' : ''}`}>
                      {formatCurrency(contract.profit)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {contract.profit_percentage >= 0 ? '+' : ''}{contract.profit_percentage?.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Entry: {contract.entry_spot_display_value}</span>
                      <span>Current: {contract.current_spot_display_value}</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          contract.profit >= 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, Math.abs(contract.profit_percentage || 0))}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">
                      {getTimeRemaining(contract.date_expiry)}
                    </span>
                  </div>

                  {/* Expand Icon */}
                  {expandedContract === contract.contract_id ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedContract === contract.contract_id && (
                <div className="px-4 pb-4 bg-gray-800/30">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500">Buy Price</p>
                      <p className="text-white">{formatCurrency(contract.buy_price)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Sell Price</p>
                      <p className="text-white">{formatCurrency(contract.bid_price)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Payout</p>
                      <p className="text-white">{formatCurrency(contract.payout)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Contract ID</p>
                      <p className="text-white font-mono text-xs">{contract.contract_id}</p>
                    </div>
                    {contract.barrier && (
                      <div>
                        <p className="text-gray-500">Barrier</p>
                        <p className="text-white">{contract.barrier}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-500">Purchased</p>
                      <p className="text-white">
                        {new Date(contract.purchase_time * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Sell Button */}
                  {contract.is_valid_to_sell === 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSell(contract.contract_id, contract.bid_price);
                      }}
                      disabled={sellingContract === contract.contract_id}
                      className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {sellingContract === contract.contract_id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Sell @ {formatCurrency(contract.bid_price)}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OpenPositions;
