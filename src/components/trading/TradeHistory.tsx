import React, { useState, useEffect } from 'react';
import { 
  Calendar, Download, Filter, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';
import websocketService from '../../services/websocketService';
import { useTradingStore } from '../../store/tradingStore';
import { format, subDays } from 'date-fns';

interface TradeRecord {
  transaction_id: number;
  contract_id: number;
  reference_id: number;
  action_type: string;
  amount: number;
  balance_after: number;
  transaction_time: number;
  longcode?: string;
  payout?: number;
  purchase_time?: number;
  sell_time?: number;
  shortcode?: string;
  app_id?: number;
}

interface ProfitRecord {
  contract_id: number;
  buy_price: number;
  sell_price: number;
  payout: number;
  profit_loss: number;
  purchase_time: number;
  sell_time: number;
  shortcode: string;
  longcode: string;
}

const TradeHistory: React.FC = () => {
  const { currency } = useTradingStore();
  const [activeTab, setActiveTab] = useState<'statement' | 'profit'>('profit');
  const [records, setRecords] = useState<(TradeRecord | ProfitRecord)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [dateFrom, setDateFrom] = useState(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState(new Date());
  const limit = 50;

  // Calculate stats
  const profitRecords = records.filter((r): r is ProfitRecord => 'profit_loss' in r);
  const totalProfit = profitRecords.reduce((sum, r) => sum + r.profit_loss, 0);
  const winCount = profitRecords.filter(r => r.profit_loss > 0).length;
  const lossCount = profitRecords.filter(r => r.profit_loss < 0).length;
  const winRate = profitRecords.length > 0 ? (winCount / profitRecords.length) * 100 : 0;

  const loadHistory = async (reset: boolean = false) => {
    setIsLoading(true);
    const newOffset = reset ? 0 : offset;

    try {
      const dateFromEpoch = Math.floor(dateFrom.getTime() / 1000);
      const dateToEpoch = Math.floor(dateTo.getTime() / 1000);

      if (activeTab === 'statement') {
        const response = await websocketService.getStatement({
          limit,
          offset: newOffset,
          date_from: dateFromEpoch,
          date_to: dateToEpoch,
        });

        if (response.statement?.transactions) {
          const transactions = response.statement.transactions;
          setRecords(reset ? transactions : [...records, ...transactions]);
          setHasMore(transactions.length === limit);
        }
      } else {
        const response = await websocketService.getProfitTable({
          limit,
          offset: newOffset,
          date_from: dateFromEpoch,
          date_to: dateToEpoch,
        });

        if (response.profit_table?.transactions) {
          const transactions = response.profit_table.transactions;
          setRecords(reset ? transactions : [...records, ...transactions]);
          setHasMore(transactions.length === limit);
        }
      }

      if (reset) {
        setOffset(limit);
      } else {
        setOffset(newOffset + limit);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(true);
  }, [activeTab, dateFrom, dateTo]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      signDisplay: 'exceptZero',
    }).format(value);
  };

  const exportToCSV = () => {
    if (profitRecords.length === 0) return;

    const headers = ['Date', 'Contract ID', 'Symbol', 'Buy Price', 'Sell Price', 'Profit/Loss'];
    const rows = profitRecords.map(r => [
      format(new Date(r.purchase_time * 1000), 'yyyy-MM-dd HH:mm'),
      r.contract_id,
      r.shortcode.split('_')[1] || r.shortcode,
      r.buy_price.toFixed(2),
      r.sell_price.toFixed(2),
      r.profit_loss.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Trade History</h3>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'profit'
                ? 'bg-deriv-red text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Profit Table
          </button>
          <button
            onClick={() => setActiveTab('statement')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'statement'
                ? 'bg-deriv-red text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Statement
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={format(dateFrom, 'yyyy-MM-dd')}
              onChange={(e) => setDateFrom(new Date(e.target.value))}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-deriv-red"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={format(dateTo, 'yyyy-MM-dd')}
              onChange={(e) => setDateTo(new Date(e.target.value))}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-deriv-red"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {activeTab === 'profit' && profitRecords.length > 0 && (
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-800 bg-gray-800/30">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total P/L</p>
            <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(totalProfit)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Trades</p>
            <p className="text-lg font-bold text-white">{profitRecords.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Win Rate</p>
            <p className={`text-lg font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {winRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Win/Loss</p>
            <p className="text-lg font-bold text-white">
              <span className="text-green-400">{winCount}</span>
              <span className="text-gray-500"> / </span>
              <span className="text-red-400">{lossCount}</span>
            </p>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
        {isLoading && records.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-deriv-red animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No trades found for this period
          </div>
        ) : activeTab === 'profit' ? (
          <table className="w-full">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Contract</th>
                <th className="px-4 py-3 text-right">Buy</th>
                <th className="px-4 py-3 text-right">Sell</th>
                <th className="px-4 py-3 text-right">P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(records as ProfitRecord[]).map((record) => (
                <tr key={record.contract_id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {format(new Date(record.purchase_time * 1000), 'MMM dd, HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {record.profit_loss >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-sm text-white truncate max-w-[200px]" title={record.longcode}>
                        {record.shortcode.split('_').slice(0, 3).join(' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-300">
                    {formatCurrency(record.buy_price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-300">
                    {formatCurrency(record.sell_price)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${
                    record.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(record.profit_loss)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(records as TradeRecord[]).map((record) => (
                <tr key={record.transaction_id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {format(new Date(record.transaction_time * 1000), 'MMM dd, HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      record.action_type === 'buy' 
                        ? 'bg-blue-500/20 text-blue-400'
                        : record.action_type === 'sell'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {record.action_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                    {record.reference_id}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${
                    record.amount >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(record.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-300">
                    {formatCurrency(record.balance_after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Load More */}
      {hasMore && records.length > 0 && (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => loadHistory()}
            disabled={isLoading}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ChevronRight className="w-4 h-4" />
                Load More
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default TradeHistory;
