import React from 'react';

export interface Column<T> {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    className?: string;
}

interface GlassTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyExtractor: (item: T) => string | number;
    isLoading?: boolean;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
}

export const GlassTable = <T,>({
    data,
    columns,
    keyExtractor,
    isLoading = false,
    emptyMessage = 'No data available',
    onRowClick
}: GlassTableProps<T>) => {

    if (isLoading) {
        return (
            <div className="w-full h-48 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 animate-pulse">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                    <span className="text-sm text-slate-500 font-medium">Loading data...</span>
                </div>
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className="w-full h-32 flex items-center justify-center rounded-xl bg-white/5 border border-dashed border-white/10">
                <p className="text-slate-500 italic text-sm">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${col.className || ''}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((item) => (
                            <tr
                                key={keyExtractor(item)}
                                onClick={() => onRowClick && onRowClick(item)}
                                className={`
                                    group transition-all duration-200
                                    ${onRowClick ? 'cursor-pointer hover:bg-white/5' : 'hover:bg-white/[0.02]'}
                                `}
                            >
                                {columns.map((col, index) => (
                                    <td
                                        key={index}
                                        className={`px-4 py-3 text-sm text-slate-300 ${col.className || ''}`}
                                    >
                                        {typeof col.accessor === 'function'
                                            ? col.accessor(item)
                                            : (item[col.accessor] as React.ReactNode)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
