import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle,
  Clock, DollarSign, Target, AlertCircle, Loader2
} from 'lucide-react';
import { useTradingStore } from '../../store/tradingStore';
import websocketService, { Contract, Proposal } from '../../services/websocketService';
import toast from 'react-hot-toast';

interface ContractType {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const contractTypes: ContractType[] = [
  { 
    value: 'CALL', 
    label: 'Rise', 
    icon: <TrendingUp className="w-5 h-5" />, 
    color: 'bg-green-500',
    description: 'Win if exit spot is higher than entry'
  },
  { 
    value: 'PUT', 
    label: 'Fall', 
    icon: <TrendingDown className="w-5 h-5" />, 
    color: 'bg-red-500',
    description: 'Win if exit spot is lower than entry'
  },
  { 
    value: 'CALLE', 
    label: 'Higher', 
    icon: <ArrowUpCircle className="w-5 h-5" />, 
    color: 'bg-blue-500',
    description: 'Win if exit spot is higher than barrier'
  },
  { 
    value: 'PUTE', 
    label: 'Lower', 
    icon: <ArrowDownCircle className="w-5 h-5" />, 
    color: 'bg-orange-500',
    description: 'Win if exit spot is lower than barrier'
  },
];

const durationUnits = [
  { value: 't', label: 'Ticks' },
  { value: 's', label: 'Seconds' },
  { value: 'm', label: 'Minutes' },
  { value: 'h', label: 'Hours' },
  { value: 'd', label: 'Days' },
];

const ContractBuilder: React.FC = () => {
  const { selectedSymbol, currentTick, balance, currency, defaultStake, addOpenContract } = useTradingStore();
  
  const [, setAvailableContracts] = useState<Contract[]>([]);
  const [selectedContractType, setSelectedContractType] = useState<string>('CALL');
  const [duration, setDuration] = useState<number>(5);
  const [durationUnit, setDurationUnit] = useState<string>('t');
  const [stake, setStake] = useState<number>(defaultStake);
  const [basis] = useState<'stake' | 'payout'>('stake');
  const [barrier, setBarrier] = useState<string>('');
  
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [isLoadingProposal, setIsLoadingProposal] = useState(false);
  const [isPlacingTrade, setIsPlacingTrade] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available contracts for symbol
  useEffect(() => {
    if (!selectedSymbol) return;

    const fetchContracts = async () => {
      try {
        const response = await websocketService.getContractsFor(selectedSymbol.symbol);
        if (response.contracts_for?.available) {
          setAvailableContracts(response.contracts_for.available);
        }
      } catch (err) {
        console.error('Error fetching contracts:', err);
      }
    };

    fetchContracts();
  }, [selectedSymbol]);

  // Get proposal when parameters change
  const getProposal = useCallback(async () => {
    if (!selectedSymbol || !stake) return;

    setIsLoadingProposal(true);
    setError(null);

    try {
      // Forget previous proposal subscription
      if (proposalId) {
        await websocketService.unsubscribe(proposalId);
      }

      const proposalParams: any = {
        contract_type: selectedContractType,
        symbol: selectedSymbol.symbol,
        duration,
        duration_unit: durationUnit,
        currency,
        amount: stake,
        basis,
      };

      if (barrier && (selectedContractType === 'CALLE' || selectedContractType === 'PUTE')) {
        proposalParams.barrier = barrier;
      }

      const subId = await websocketService.subscribeProposal(proposalParams, (data) => {
        if (data.proposal) {
          setProposal(data.proposal);
        }
        if (data.error) {
          setError(data.error.message);
        }
      });

      setProposalId(subId);
    } catch (err: any) {
      setError(err.message || 'Failed to get proposal');
    } finally {
      setIsLoadingProposal(false);
    }
  }, [selectedSymbol, selectedContractType, duration, durationUnit, stake, basis, barrier, currency, proposalId]);

  // Debounced proposal update
  useEffect(() => {
    const timer = setTimeout(() => {
      getProposal();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, selectedContractType, duration, durationUnit, stake, basis, barrier]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (proposalId) {
        websocketService.unsubscribe(proposalId);
      }
    };
  }, [proposalId]);

  const handleBuy = async () => {
    if (!proposal || !proposalId) return;

    setIsPlacingTrade(true);
    setError(null);

    try {
      const response = await websocketService.buy(proposal.id, proposal.ask_price);
      
      if (response.buy) {
        toast.success(
          <div>
            <p className="font-bold">Trade Placed!</p>
            <p className="text-sm">Contract ID: {response.buy.contract_id}</p>
          </div>,
          { duration: 4000 }
        );

        // Subscribe to contract updates
        websocketService.subscribeOpenContract(response.buy.contract_id, (data) => {
          if (data.proposal_open_contract) {
            addOpenContract(data.proposal_open_contract);
          }
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to place trade');
      toast.error(err.message || 'Failed to place trade');
    } finally {
      setIsPlacingTrade(false);
    }
  };

  const isMarketClosed = selectedSymbol && (!selectedSymbol.exchange_is_open || selectedSymbol.is_trading_suspended);
  const canTrade = selectedSymbol && proposal && !isMarketClosed && stake > 0 && stake <= balance;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="glass-panel p-5 h-full flex flex-col">
      <h3 className="text-lg font-bold text-white mb-4">Trade</h3>

      {!selectedSymbol ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Select a market to trade
        </div>
      ) : (
        <>
          {/* Market Status */}
          {isMarketClosed && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-red-400">Market is currently closed</span>
            </div>
          )}

          {/* Contract Type */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Contract Type</label>
            <div className="grid grid-cols-2 gap-2">
              {contractTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedContractType(type.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedContractType === type.value
                      ? `border-current ${type.color} bg-opacity-20`
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={selectedContractType === type.value ? 'text-white' : 'text-gray-400'}>
                      {type.icon}
                    </span>
                    <span className={`font-medium ${
                      selectedContractType === type.value ? 'text-white' : 'text-gray-300'
                    }`}>
                      {type.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Duration
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-deriv-red"
                min="1"
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-deriv-red"
              >
                {durationUnits.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Barrier (for Higher/Lower) */}
          {(selectedContractType === 'CALLE' || selectedContractType === 'PUTE') && (
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-2 block flex items-center gap-1">
                <Target className="w-3 h-3" />
                Barrier
              </label>
              <input
                type="text"
                value={barrier}
                onChange={(e) => setBarrier(e.target.value)}
                placeholder={currentTick ? currentTick.quote.toString() : 'Enter barrier'}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-deriv-red"
              />
            </div>
          )}

          {/* Stake */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Stake
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {currency}
              </span>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-14 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-deriv-red"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[5, 10, 25, 50, 100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setStake(amount)}
                  className={`flex-1 py-1 text-xs rounded border transition-colors ${
                    stake === amount
                      ? 'bg-deriv-red border-deriv-red text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* Proposal Preview */}
          <div className="mb-4 p-4 bg-white/5 rounded-2xl border border-white/10">
            {isLoadingProposal ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 text-deriv-red animate-spin" />
              </div>
            ) : proposal ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Payout</span>
                  <span className="text-white font-bold text-lg">
                    {formatCurrency(proposal.payout)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Potential Profit</span>
                  <span className="text-green-400 font-medium">
                    +{formatCurrency(proposal.payout - proposal.ask_price)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Entry Spot</span>
                  <span className="text-gray-300">{proposal.spot}</span>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-400 text-sm">
                {error}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                Configure trade to see preview
              </div>
            )}
          </div>

          {/* Buy Button */}
          <button
            onClick={handleBuy}
            disabled={!canTrade || isPlacingTrade}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-all ${
              canTrade
                ? selectedContractType === 'CALL' || selectedContractType === 'CALLE'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-700 cursor-not-allowed'
            }`}
          >
            {isPlacingTrade ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Placing Trade...
              </>
            ) : (
              <>
                {selectedContractType === 'CALL' || selectedContractType === 'CALLE' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                {contractTypes.find(t => t.value === selectedContractType)?.label}
                {proposal && ` - ${formatCurrency(proposal.ask_price)}`}
              </>
            )}
          </button>

          {/* Balance Warning */}
          {stake > balance && (
            <p className="mt-2 text-xs text-red-400 text-center">
              Insufficient balance. Available: {formatCurrency(balance)}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ContractBuilder;
