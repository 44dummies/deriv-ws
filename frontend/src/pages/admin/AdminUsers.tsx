import { useState } from 'react';
import { Users, Search, Loader2 } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useQuery } from '@tanstack/react-query';

// Fetch real users from backend API
const useUsers = () => {
    return useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const url = `${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000'}/api/v1/users`;
            const res = await fetch(url, {
                credentials: 'include'
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
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        User directory
                    </h1>
                    <p className="text-sm text-muted-foreground">Monitor user access and roles.</p>
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
                        <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-md border border-border w-full max-w-md mb-6">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search users by email..."
                                className="bg-transparent border-none outline-none text-sm text-foreground w-full placeholder:text-muted-foreground"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-muted-foreground border-b border-border text-left">
                                        <th className="pb-3 pl-4">User</th>
                                        <th className="pb-3">Role</th>
                                        <th className="pb-3">Joined</th>
                                        <th className="pb-3 text-right pr-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredUsers.map((u: { id: string; email: string; role: string; created_at: string }) => (
                                        <tr key={u.id} className="group hover:bg-muted/40 transition-colors">
                                            <td className="py-4 pl-4 font-medium text-foreground">{u.email}</td>
                                            <td className="py-4">
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${u.role === 'ADMIN' ? 'border-primary/30 text-primary' : 'border-border text-muted-foreground'}`}>
                                                    {u.role || 'USER'}
                                                </span>
                                            </td>
                                            <td className="py-4 text-muted-foreground">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 text-right pr-4">
                                                <button className="text-primary hover:text-foreground text-xs underline opacity-0 group-hover:opacity-100 transition-opacity">
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
