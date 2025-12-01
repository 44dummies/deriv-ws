import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useTradingStore } from '../../store/tradingStore';
import websocketService from '../../services/websocketService';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

type ChartType = 'candles' | 'line' | 'area';
type TimeFrame = { label: string; granularity: number };

const timeFrames: TimeFrame[] = [
  { label: '1m', granularity: 60 },
  { label: '5m', granularity: 300 },
  { label: '15m', granularity: 900 },
  { label: '1h', granularity: 3600 },
  { label: '4h', granularity: 14400 },
  { label: '1d', granularity: 86400 },
];

const PriceChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  
  const { selectedSymbol, currentTick, setCurrentTick } = useTradingStore();
  
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>(timeFrames[0]);
  const [priceChange, setPriceChange] = useState<{ value: number; percent: number }>({ value: 0, percent: 0 });
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previousClose, setPreviousClose] = useState<number | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a2e' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2d2d44' },
        horzLines: { color: '#2d2d44' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#ff444f', labelBackgroundColor: '#ff444f' },
        horzLine: { color: '#ff444f', labelBackgroundColor: '#ff444f' },
      },
      rightPriceScale: {
        borderColor: '#2d2d44',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#2d2d44',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: { mouseWheel: true, pinch: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }

    if (chartType === 'candles') {
      seriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
    } else if (chartType === 'line') {
      seriesRef.current = chartRef.current.addLineSeries({ 
        color: '#ff444f', 
        lineWidth: 2,
      });
    } else {
      seriesRef.current = chartRef.current.addAreaSeries({
        topColor: 'rgba(255, 68, 79, 0.4)',
        bottomColor: 'rgba(255, 68, 79, 0.0)',
        lineColor: '#ff444f',
        lineWidth: 2,
      });
    }
  }, [chartType]);

  useEffect(() => {
    if (!selectedSymbol || !seriesRef.current) return;

    const loadData = async () => {
      setIsLoading(true);
      
      if (subscriptionId) {
        await websocketService.unsubscribe(subscriptionId);
      }

      try {
        const historyResponse = await websocketService.getTicksHistory(selectedSymbol.symbol, {
          count: 500,
          granularity: selectedTimeFrame.granularity,
          style: chartType === 'candles' ? 'candles' : 'ticks',
        });

        if (chartType === 'candles' && historyResponse.candles) {
          const candleData = historyResponse.candles.map((c: any) => ({
            time: c.epoch as number,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
          }));
          seriesRef.current?.setData(candleData);
          
          if (candleData.length > 1) {
            const lastClose = candleData[candleData.length - 1].close;
            const prevClose = candleData[candleData.length - 2].close;
            setPreviousClose(prevClose);
            setPriceChange({
              value: lastClose - prevClose,
              percent: ((lastClose - prevClose) / prevClose) * 100,
            });
          }
        } else if (historyResponse.history) {
          const lineData = historyResponse.history.prices.map((price: number, i: number) => ({
            time: historyResponse.history.times[i] as number,
            value: price,
          }));
          seriesRef.current?.setData(lineData);
          
          if (lineData.length > 1) {
            const lastPrice = lineData[lineData.length - 1].value;
            const firstPrice = lineData[0].value;
            setPreviousClose(firstPrice);
            setPriceChange({
              value: lastPrice - firstPrice,
              percent: ((lastPrice - firstPrice) / firstPrice) * 100,
            });
          }
        }

        if (chartType === 'candles') {
          const subId = await websocketService.subscribeCandles(
            selectedSymbol.symbol,
            selectedTimeFrame.granularity,
            (data) => {
              if (data.ohlc) {
                const candle = {
                  time: data.ohlc.open_time as number,
                  open: parseFloat(data.ohlc.open),
                  high: parseFloat(data.ohlc.high),
                  low: parseFloat(data.ohlc.low),
                  close: parseFloat(data.ohlc.close),
                };
                (seriesRef.current as any)?.update(candle);
                
                if (previousClose) {
                  setPriceChange({
                    value: candle.close - previousClose,
                    percent: ((candle.close - previousClose) / previousClose) * 100,
                  });
                }
              }
            }
          );
          setSubscriptionId(subId);
        } else {
          const subId = await websocketService.subscribeTicks(
            selectedSymbol.symbol,
            (data) => {
              if (data.tick) {
                const tick = data.tick;
                setCurrentTick(tick);
                
                const point = { time: tick.epoch as number, value: tick.quote };
                (seriesRef.current as any)?.update(point);
                
                if (previousClose) {
                  setPriceChange({
                    value: tick.quote - previousClose,
                    percent: ((tick.quote - previousClose) / previousClose) * 100,
                  });
                }
              }
            }
          );
          setSubscriptionId(subId);
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      if (subscriptionId) {
        websocketService.unsubscribe(subscriptionId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, selectedTimeFrame, chartType]);

  const formatPrice = (price: number) => {
    if (!selectedSymbol) return '0.00';
    const decimals = Math.max(2, -Math.floor(Math.log10(selectedSymbol.pip)));
    return price.toFixed(decimals);
  };

  return (
    <div className="glass-panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          {selectedSymbol ? (
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${selectedSymbol.exchange_is_open ? 'bg-green-500' : 'bg-red-500'}`} />
                <h2 className="text-xl font-bold text-white">{selectedSymbol.display_name}</h2>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-white">
                  {currentTick ? formatPrice(currentTick.quote) : '--'}
                </span>
                {priceChange.value !== 0 && (
                  <span className={`flex items-center gap-1 text-sm font-medium ${priceChange.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {priceChange.value >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {priceChange.value >= 0 ? '+' : ''}{formatPrice(priceChange.value)}
                    ({priceChange.percent >= 0 ? '+' : ''}{priceChange.percent.toFixed(2)}%)
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Select a market to view chart</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-800 rounded-lg p-1">
            {timeFrames.map((tf) => (
              <button
                key={tf.label}
                onClick={() => setSelectedTimeFrame(tf)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  selectedTimeFrame.label === tf.label ? 'bg-deriv-red text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['candles', 'line', 'area'] as ChartType[]).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                  chartType === type ? 'bg-deriv-red text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {currentTick && (
        <div className="flex flex-wrap gap-4 px-4 py-2 bg-white/5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">BID</span>
            <span className="text-sm font-mono text-red-400">{formatPrice(currentTick.bid)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">ASK</span>
            <span className="text-sm font-mono text-green-400">{formatPrice(currentTick.ask)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">SPREAD</span>
            <span className="text-sm font-mono text-gray-400">{formatPrice(currentTick.ask - currentTick.bid)}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500">{new Date(currentTick.epoch * 1000).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur z-10">
            <div className="w-8 h-8 border-2 border-deriv-red/20 border-t-deriv-red rounded-full animate-spin" />
          </div>
        )}
        {!selectedSymbol && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500">Select a symbol from the market list</p>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default PriceChart;
