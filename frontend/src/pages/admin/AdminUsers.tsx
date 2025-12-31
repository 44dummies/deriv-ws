import { useState } from 'react';
import { Users, Search, Circle, Loader2 } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useQuery } from '@tanstack/react-query';

// Fetch real users from backend API
const useUsers = () => {
    return useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const url = `${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4000'}/api/v1/users`;
            const token = localStorage.getItem('auth_token');
            const res = await fetch(url, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) return [];
            return res.json();
        },
        staleTime: 60000
    });
};

export default function AdminUsers() {
    const [searchTerm, setSearchTerm] = useState('');
    const { data: users = [], isLoading } = useUsers();

    const filteredUsers = users.filter((u: any) => u.email?.includes(searchTerm));

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        User Directory
                    </h1>
                    <p className="text-slate-500 text-sm">Monitor online presence and account health.</p>
                </div>
            </header>

            <GlassCard className="p-4">
                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                )}
                {!isLoading && (
                    <>
                        <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5 w-full max-w-md mb-6">
                            <Search className="h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search users by email..."
                                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-600"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-slate-500 border-b border-white/5 text-left">
                                        <th className="pb-3 pl-4">User</th>
                                        <th className="pb-3">Role</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3">Balance (Real)</th>
                                        <th className="pb-3">Last Seen</th>
                                        <th className="pb-3 text-right pr-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="py-4 pl-4 font-medium text-white">{u.email}</td>
                                            <td className="py-4">
                                                <span className={`px-2 py-0.5 rounded textxs font-bold ${u.role === 'ADMIN' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="py-4 flex items-center gap-2">
                                                <Circle className={`h-2 w-2 fill-current ${u.status === 'online' ? 'text-green-500' : 'text-slate-600'}`} />
                                                <span className="capitalize text-slate-400">{u.status}</span>
                                            </td>
                                            <td className="py-4 font-mono text-slate-300">${u.balance.toLocaleString()}</td>
                                            <td className="py-4 text-slate-500">{u.last_seen}</td>
                                            <td className="py-4 text-right pr-4">
                                                <button className="text-blue-400 hover:text-white text-xs underline opacity-0 group-hover:opacity-100 transition-opacity">
                                                    View Profile
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </GlassCard>
        </div>
    );
}
