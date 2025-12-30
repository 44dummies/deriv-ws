import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface FeedListProps {
    title: string;
    icon: LucideIcon;
    iconColor?: string;
    children: ReactNode;
    isEmpty?: boolean;
    emptyMessage?: string;
}

export function FeedList({ title, icon: Icon, iconColor = 'text-gray-400', children, isEmpty, emptyMessage }: FeedListProps) {
    return (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-xl flex flex-col h-[650px]">
            <div className={`flex items-center gap-2 mb-6 ${iconColor}`}>
                <Icon className="w-5 h-5" />
                <h2 className="text-xl font-semibold text-white">{title}</h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 opacity-50">
                        <Icon className="w-8 h-8" />
                        <p>{emptyMessage || 'No events yet...'}</p>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}
