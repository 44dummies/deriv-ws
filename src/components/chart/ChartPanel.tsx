import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, LineData, Time, UTCTimestamp } from 'lightweight-charts';

interface ChartProps {
    initialTicks: { epoch: number; quote: number }[];
    currentTick: { tick: number; time: number } | null;
    tradeMarkers: { time: number; type: string; price: number }[];
    signalMarkers: { time: number; type: string }[];
    height?: number;
}

export const ChartPanel: React.FC<ChartProps> = ({
    initialTicks,
    currentTick,
    tradeMarkers,
    signalMarkers,
    height = 400
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
    const [lastTickTime, setLastTickTime] = useState<number>(0);

    // Initialize Chart with ResizeObserver
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const container = chartContainerRef.current;
        let chart: IChartApi | null = null;
        let series: ISeriesApi<"Area"> | null = null;

        const initChart = () => {
            if (chart) return;
            const width = container.clientWidth;
            if (width === 0) return; // Wait for container to have dimensions

            chart = createChart(container, {
                layout: {
                    background: { type: ColorType.Solid, color: '#10141e' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                    horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
                },
                width: width,
                height: height,
                crosshair: { mode: CrosshairMode.Normal },
                timeScale: { timeVisible: true, secondsVisible: true },
            });

            series = chart.addAreaSeries({
                topColor: 'rgba(76, 175, 80, 0.56)',
                bottomColor: 'rgba(76, 175, 80, 0.04)',
                lineColor: 'rgba(76, 175, 80, 1)',
                lineWidth: 2,
            });

            if (initialTicks.length > 0) {
                const data: LineData[] = initialTicks
                    .map(t => ({
                        time: t.epoch as UTCTimestamp,
                        value: t.quote
                    }))
                    .sort((a, b) => (a.time as number) - (b.time as number));

                series.setData(data);
                setLastTickTime(initialTicks[initialTicks.length - 1].epoch);
            }

            chartRef.current = chart;
            seriesRef.current = series;
        };

        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width } = entries[0].contentRect;

            if (width > 0) {
                if (!chart) {
                    initChart();
                } else {
                    chart.applyOptions({ width });
                }
            }
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            if (chart) {
                chart.remove();
                chartRef.current = null;
                seriesRef.current = null;
            }
        };
    }, []);

    // Update with new ticks
    useEffect(() => {
        if (!seriesRef.current || !currentTick) return;

        // De-dupe based on time to avoid chart errors
        if (currentTick.time > lastTickTime) {
            seriesRef.current.update({
                time: currentTick.time as UTCTimestamp,
                value: currentTick.tick
            });
            setLastTickTime(currentTick.time);
        }
    }, [currentTick, lastTickTime]);

    // Update markers (Trades & Signals)
    useEffect(() => {
        if (!seriesRef.current) return;

        const markers: any[] = [];

        // Add Trade Markers
        // Add Trade Markers
        tradeMarkers.forEach(m => {
            const typeLower = m.type.toLowerCase();
            let color = '#2196f3';
            let shape: any = 'circle';
            let text = m.type.toUpperCase();
            let position: any = 'aboveBar';

            if (typeLower.includes('break_even')) {
                shape = 'square';
                color = '#fbbf24'; // Amber
                text = 'BE';
                position = 'aboveBar';
            } else if (typeLower.includes('trailing_stop') || typeLower.includes('trailing')) {
                shape = 'arrowDown';
                color = '#c084fc'; // Purple
                text = 'TS';
                position = 'aboveBar';
            } else if (typeLower === 'tp_hit' || typeLower === 'win' || typeLower === 'won') {
                shape = 'arrowUp';
                color = '#4caf50';
                text = 'TP';
                position = 'belowBar';
            } else if (typeLower === 'sl_hit' || typeLower === 'loss' || typeLower === 'lost') {
                shape = 'arrowDown';
                color = '#f44336';
                text = 'SL';
                position = 'aboveBar';
            } else {
                // Standard Entry
                const isCallSide = typeLower.includes('buy') || typeLower.includes('call') || typeLower.includes('over');
                position = isCallSide ? 'belowBar' : 'aboveBar';
                color = isCallSide ? '#4caf50' : '#e91e63';
                shape = isCallSide ? 'arrowUp' : 'arrowDown';
                text = isCallSide ? 'OPEN' : 'OPEN';
            }

            markers.push({
                time: m.time as UTCTimestamp,
                position: position,
                color: color,
                shape: shape,
                text: text,
            });
        });

        // Add Signal Markers (Circles)
        signalMarkers.forEach(s => {
            markers.push({
                time: s.time as UTCTimestamp,
                position: 'aboveBar',
                color: s.type === 'CALL' || s.type === 'OVER' ? '#2196f3' : '#ff9800', // Blue/Orange
                shape: 'circle',
                text: 'S',
            });
        });

        seriesRef.current.setMarkers(markers.sort((a, b) => (a.time as number) - (b.time as number)));
    }, [tradeMarkers, signalMarkers]);

    return <div ref={chartContainerRef} className="w-full relative" style={{ height }} />;
};
