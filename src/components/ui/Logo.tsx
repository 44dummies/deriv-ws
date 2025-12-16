import React from 'react';

interface LogoProps {
    className?: string;
    size?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 32 }) => {
    return (
        <img
            src="/favicon.svg"
            alt="TraderMind Logo"
            width={size}
            height={size}
            className={className}
        />
    );
};
