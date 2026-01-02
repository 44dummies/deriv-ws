/**
 * Premium UI Components
 * Glass morphism, shader gradients, liquid effects, scroll animations
 */

import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { useRef, ReactNode, useEffect, useState } from 'react';
import { cn } from '../lib/utils';

// =============================================================================
// ANIMATED GRADIENT BACKGROUND
// =============================================================================

export function AnimatedGradientBackground({ className }: { className?: string }) {
    return (
        <div className={cn("fixed inset-0 -z-10 overflow-hidden", className)}>
            {/* Base gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900 to-black" />
            
            {/* Animated orbs */}
            <motion.div
                className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-r from-blue-600/30 to-purple-600/30 blur-[120px]"
                animate={{
                    x: ['-20%', '20%', '-20%'],
                    y: ['-20%', '30%', '-20%'],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{ top: '-20%', left: '-10%' }}
            />
            <motion.div
                className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-[100px]"
                animate={{
                    x: ['20%', '-20%', '20%'],
                    y: ['30%', '-10%', '30%'],
                    scale: [1.2, 1, 1.2],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{ top: '40%', right: '-10%' }}
            />
            <motion.div
                className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-cyan-600/20 to-blue-600/20 blur-[80px]"
                animate={{
                    x: ['-10%', '10%', '-10%'],
                    y: ['10%', '-10%', '10%'],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{ bottom: '-10%', left: '30%' }}
            />
            
            {/* Noise overlay for texture */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-50" />
            
            {/* Grid overlay */}
            <div 
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            />
        </div>
    );
}

// =============================================================================
// GLASS CARD COMPONENT
// =============================================================================

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    glow?: 'blue' | 'purple' | 'emerald' | 'orange' | 'pink' | 'cyan' | 'none';
    blur?: 'sm' | 'md' | 'lg' | 'xl';
}

const glowColors = {
    blue: 'hover:shadow-blue-500/20 hover:border-blue-500/30',
    purple: 'hover:shadow-purple-500/20 hover:border-purple-500/30',
    emerald: 'hover:shadow-emerald-500/20 hover:border-emerald-500/30',
    orange: 'hover:shadow-orange-500/20 hover:border-orange-500/30',
    pink: 'hover:shadow-pink-500/20 hover:border-pink-500/30',
    cyan: 'hover:shadow-cyan-500/20 hover:border-cyan-500/30',
    none: '',
};

const blurLevels = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
};

export function GlassCard({ 
    children, 
    className, 
    hover = true, 
    glow = 'blue',
    blur = 'lg'
}: GlassCardProps) {
    return (
        <div
            className={cn(
                "relative rounded-2xl border border-white/10 bg-white/5",
                blurLevels[blur],
                hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl",
                hover && glowColors[glow],
                className
            )}
        >
            {/* Inner glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            {children}
        </div>
    );
}

// =============================================================================
// SCROLL REVEAL COMPONENT
// =============================================================================

interface ScrollRevealProps {
    children: ReactNode;
    className?: string;
    direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
    delay?: number;
    duration?: number;
}

export function ScrollReveal({ 
    children, 
    className, 
    direction = 'up',
    delay = 0,
    duration = 0.6
}: ScrollRevealProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const variants = {
        up: { y: 60, opacity: 0 },
        down: { y: -60, opacity: 0 },
        left: { x: 60, opacity: 0 },
        right: { x: -60, opacity: 0 },
        scale: { scale: 0.8, opacity: 0 },
    };

    return (
        <motion.div
            ref={ref}
            initial={variants[direction]}
            animate={isInView ? { x: 0, y: 0, scale: 1, opacity: 1 } : variants[direction]}
            transition={{ 
                duration, 
                delay, 
                ease: [0.25, 0.4, 0.25, 1]
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// =============================================================================
// LIQUID BUTTON
// =============================================================================

interface LiquidButtonProps {
    children: ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    disabled?: boolean;
    loading?: boolean;
}

export function LiquidButton({ 
    children, 
    onClick, 
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    loading
}: LiquidButtonProps) {
    const variants = {
        primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25',
        secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
        ghost: 'bg-transparent hover:bg-white/10 text-white',
        danger: 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-red-500/25',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled || loading}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            className={cn(
                "relative overflow-hidden rounded-xl font-bold transition-all duration-300",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variants[variant],
                sizes[size],
                className
            )}
        >
            {/* Liquid shimmer effect */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
            
            <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                    <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                ) : children}
            </span>
        </motion.button>
    );
}

// =============================================================================
// PARALLAX CONTAINER
// =============================================================================

interface ParallaxProps {
    children: ReactNode;
    speed?: number;
    className?: string;
}

export function Parallax({ children, speed = 0.5, className }: ParallaxProps) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start end', 'end start']
    });

    const y = useTransform(scrollYProgress, [0, 1], [-100 * speed, 100 * speed]);
    const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

    return (
        <motion.div ref={ref} style={{ y: smoothY }} className={className}>
            {children}
        </motion.div>
    );
}

// =============================================================================
// FLOATING ELEMENT
// =============================================================================

interface FloatingProps {
    children: ReactNode;
    duration?: number;
    distance?: number;
    className?: string;
}

export function Floating({ children, duration = 3, distance = 10, className }: FloatingProps) {
    return (
        <motion.div
            animate={{
                y: [-distance, distance, -distance],
            }}
            transition={{
                duration,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// =============================================================================
// SHIMMER TEXT
// =============================================================================

interface ShimmerTextProps {
    children: string;
    className?: string;
}

export function ShimmerText({ children, className }: ShimmerTextProps) {
    return (
        <span className={cn("relative inline-block", className)}>
            <span className="bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer">
                {children}
            </span>
        </span>
    );
}

// =============================================================================
// GLOW ORBS
// =============================================================================

export function GlowOrb({ 
    color = 'blue', 
    size = 200, 
    className 
}: { 
    color?: 'blue' | 'purple' | 'pink' | 'cyan' | 'emerald';
    size?: number;
    className?: string;
}) {
    const colors = {
        blue: 'from-blue-500 to-blue-700',
        purple: 'from-purple-500 to-purple-700',
        pink: 'from-pink-500 to-pink-700',
        cyan: 'from-cyan-500 to-cyan-700',
        emerald: 'from-emerald-500 to-emerald-700',
    };

    return (
        <motion.div
            className={cn(
                "absolute rounded-full opacity-40 blur-[100px]",
                `bg-gradient-to-r ${colors[color]}`,
                className
            )}
            style={{ width: size, height: size }}
            animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
    );
}

// =============================================================================
// INTERACTIVE CARD
// =============================================================================

interface InteractiveCardProps {
    children: ReactNode;
    className?: string;
}

export function InteractiveCard({ children, className }: InteractiveCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        setRotateX((y - centerY) / 20);
        setRotateY((centerX - x) / 20);
    };

    const handleMouseLeave = () => {
        setRotateX(0);
        setRotateY(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
                "relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg",
                "transition-shadow duration-300 hover:shadow-2xl hover:shadow-blue-500/10",
                className
            )}
        >
            {/* Spotlight effect */}
            <div 
                className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                    background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59, 130, 246, 0.1), transparent 40%)'
                }}
            />
            {children}
        </motion.div>
    );
}

// =============================================================================
// COUNTER ANIMATION
// =============================================================================

interface AnimatedCounterProps {
    value: number;
    prefix?: string;
    suffix?: string;
    duration?: number;
    className?: string;
    decimals?: number;
}

export function AnimatedCounter({ 
    value, 
    prefix = '', 
    suffix = '', 
    duration = 2,
    className,
    decimals = 0
}: AnimatedCounterProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (!isInView) return;
        
        let startTime: number;
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
            setDisplayValue(eased * value);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }, [isInView, value, duration]);

    return (
        <span ref={ref} className={className}>
            {prefix}{displayValue.toFixed(decimals)}{suffix}
        </span>
    );
}

// =============================================================================
// MAGNETIC WRAPPER
// =============================================================================

interface MagneticProps {
    children: ReactNode;
    strength?: number;
}

export function Magnetic({ children, strength = 0.3 }: MagneticProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        setPosition({
            x: (e.clientX - centerX) * strength,
            y: (e.clientY - centerY) * strength,
        });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={position}
            transition={{ type: 'spring', stiffness: 150, damping: 15 }}
        >
            {children}
        </motion.div>
    );
}
