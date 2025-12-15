import React, { useRef, useState, useLayoutEffect, ReactNode } from 'react';

interface ChartBlockProps {
    children: ReactNode;
    className?: string;
    height?: number | string;
    minHeight?: number | string;
}

/**
 * ChartBlock - A wrapper for Recharts that prevents "width(-1) and height(-1)" errors
 * by ensuring the container has valid dimensions before rendering the chart.
 */
export const ChartBlock: React.FC<ChartBlockProps> = ({
    children,
    className = "",
    height = "100%",
    minHeight = 250
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);

    useLayoutEffect(() => {
        if (!ref.current) return;

        const check = () => {
            if (!ref.current) return;
            const { offsetWidth, offsetHeight } = ref.current;
            // Only render if we have actual pixels to draw on
            if (offsetWidth > 0 && offsetHeight > 0) {
                setReady(true);
            } else {
                setReady(false);
            }
        };

        // Check immediately
        check();

        // Check on resize
        window.addEventListener('resize', check);

        // Optional: Check with ResizeObserver if available for more robust container logic
        const resizeObserver = new ResizeObserver(() => check());
        resizeObserver.observe(ref.current);

        return () => {
            window.removeEventListener('resize', check);
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div
            ref={ref}
            className={`w-full relative ${className}`}
            style={{
                height,
                minHeight
            }}
        >
            {ready ? children : <div className="animate-pulse w-full h-full bg-white/5 rounded-xl" />}
        </div>
    );
};
