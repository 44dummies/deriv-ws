import React from 'react';

interface LogoProps {
    className?: string;
    size?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 32 }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ff3355" />
                    <stop offset="100%" stopColor="#ff8042" />
                </linearGradient>
                <filter id="glow" x="-4" y="-4" width="40" height="40" filterUnits="userSpaceOnUse">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <path
                d="M16 2L2 9L16 16L30 9L16 2Z"
                fill="url(#logo-gradient)"
                filter="url(#glow)"
            />
            <path
                d="M2 23L16 30L30 23V9L16 16L2 9V23Z"
                fill="url(#logo-gradient)"
                fillOpacity="0.8"
            />
            <path
                d="M16 16V30M16 16L30 9M16 16L2 9"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
            />
        </svg>
    );
};
