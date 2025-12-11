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

    // Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#10141e' }, // Dark bg matching Deriv/Admin
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: height,
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
            },
        });

        const series = chart.addAreaSeries({
            topColor: 'rgba(76, 175, 80, 0.56)', // Deriv Green-ish
            bottomColor: 'rgba(76, 175, 80, 0.04)',
            lineColor: 'rgba(76, 175, 80, 1)',
            lineWidth: 2,
        });

        // Load initial data
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

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
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
        tradeMarkers.forEach(m => {
            markers.push({
                time: m.time as UTCTimestamp,
                position: m.type === 'buy' || m.type === 'call' ? 'belowBar' : 'aboveBar',
                color: m.type === 'buy' || m.type === 'call' ? '#4caf50' : '#e91e63',
                shape: m.type === 'buy' || m.type === 'call' ? 'arrowUp' : 'arrowDown',
                text: m.type.toUpperCase(),
            });
        });

        // Add Signal Markers (Circles)
        signalMarkers.forEach(s => {
            markers.push({
                time: s.time as UTCTimestamp,
                position: 'inBar',
                color: s.type === 'CALL' ? '#2196f3' : '#ff9800', // Blue/Orange
                shape: 'circle',
                text: 'S',
            });
        });

        seriesRef.current.setMarkers(markers.sort((a, b) => (a.time as number) - (b.time as number)));
    }, [tradeMarkers, signalMarkers]);

    return <div ref={chartContainerRef} className="w-full relative" style={{ height }} />;
};
