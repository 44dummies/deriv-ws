import React from 'react';

export const AuroraBackground: React.FC = () => {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-[#030712]">
            {/* Mesh Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-purple-900/30 rounded-full blur-[120px] animate-pulse-slow mix-blend-screen" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-blue-900/30 rounded-full blur-[120px] animate-pulse-slow mix-blend-screen animation-delay-2000" />
            <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-cyan-900/20 rounded-full blur-[100px] animate-float mix-blend-screen" />

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />
        </div>
    );
};
