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

export function FeedList({ title, icon: Icon, iconColor = 'text-muted-foreground', children, isEmpty, emptyMessage }: FeedListProps) {
    return (
        <div className="glass-panel p-6 rounded-lg border border-border flex flex-col h-[650px]">
            <div className={`flex items-center gap-2 mb-6 ${iconColor}`}>
                <Icon className="w-5 h-5" />
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 opacity-50">
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
