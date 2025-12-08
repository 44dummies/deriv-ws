/**
 * Users Management Page
 * View and manage user accounts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Search, Shield, ShieldOff, User, Eye,
    RefreshCw
} from 'lucide-react';
import apiClient from '../../services/apiClient';

interface UserData {
    id: string;
    deriv_id?: string;
    email?: string;
    fullname?: string;
    username?: string;
    is_admin?: boolean;
    is_online?: boolean;
    created_at?: string;
    last_seen?: string;
    performance_tier?: string;
}

const UsersPage: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const loadUsers = useCallback(async () => {
        try {
            const response = await apiClient.get<{ users: UserData[] }>('/admin/users');
            setUsers(response?.users || []);
        } catch (error) {
            console.error('Failed to load users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const toggleAdminRole = async (userId: string, currentStatus: boolean) => {
        try {
            await apiClient.put(`/admin/users/${userId}/role`, {
                is_admin: !currentStatus
            });
            toast.success(`User ${!currentStatus ? 'promoted to' : 'removed from'} admin`);
            loadUsers();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update user role');
        }
    };

    const formatDate = (date?: string): string => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const filteredUsers = users.filter(user => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            (user.fullname?.toLowerCase().includes(searchLower)) ||
            (user.email?.toLowerCase().includes(searchLower)) ||
            (user.deriv_id?.toLowerCase().includes(searchLower)) ||
            (user.username?.toLowerCase().includes(searchLower));

        const matchesRole = roleFilter === 'all' ||
            (roleFilter === 'admin' && user.is_admin) ||
            (roleFilter === 'user' && !user.is_admin);

        return matchesSearch && matchesRole;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <>
            {/* Header Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '500px' }}>
                    {/* Search */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        flex: 1
                    }}>
                        <Search size={18} style={{ color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#fff',
                                fontSize: '14px',
                                width: '100%'
                            }}
                        />
                    </div>

                    {/* Role Filter */}
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#fff',
                            fontSize: '14px',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admins</option>
                        <option value="user">Users</option>
                    </select>
                </div>

                <button className="btn btn-secondary" onClick={loadUsers}>
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="admin-card" style={{ padding: '20px' }}>
                    <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>Total Users</div>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>{users.length}</div>
                </div>
                <div className="admin-card" style={{ padding: '20px' }}>
                    <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>Admins</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#8b5cf6' }}>
                        {users.filter(u => u.is_admin).length}
                    </div>
                </div>
                <div className="admin-card" style={{ padding: '20px' }}>
                    <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>Online Now</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
                        {users.filter(u => u.is_online).length}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="admin-card" style={{ overflow: 'hidden' }}>
                {filteredUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                        <User size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>No users found</h3>
                        <p>Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Deriv ID</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Tier</th>
                                <th>Joined</th>
                                <th style={{ width: '100px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: user.is_admin
                                                    ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                                                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 600,
                                                fontSize: '14px'
                                            }}>
                                                {(user.fullname || user.username || 'U').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{user.fullname || user.username || 'Unknown'}</div>
                                                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{user.email || '-'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <code style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: 'rgba(255,255,255,0.05)',
                                            fontSize: '12px'
                                        }}>
                                            {user.deriv_id || '-'}
                                        </code>
                                    </td>
                                    <td>
                                        <span className={`badge ${user.is_admin ? 'badge-info' : 'badge-neutral'}`}>
                                            {user.is_admin ? (
                                                <><Shield size={12} /> Admin</>
                                            ) : (
                                                <><User size={12} /> User</>
                                            )}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${user.is_online ? 'badge-success' : 'badge-neutral'}`}>
                                            {user.is_online ? 'Online' : 'Offline'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge badge-warning" style={{ textTransform: 'capitalize' }}>
                                            {user.performance_tier || 'Beginner'}
                                        </span>
                                    </td>
                                    <td style={{ color: '#9ca3af' }}>{formatDate(user.created_at)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="btn btn-icon btn-secondary"
                                                onClick={() => navigate(`/admin/users/${user.id}`)}
                                                title="View details"
                                                style={{ padding: '8px' }}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className={`btn btn-icon ${user.is_admin ? 'btn-danger' : 'btn-primary'}`}
                                                onClick={() => toggleAdminRole(user.id, user.is_admin || false)}
                                                title={user.is_admin ? 'Remove admin' : 'Make admin'}
                                                style={{ padding: '8px' }}
                                            >
                                                {user.is_admin ? <ShieldOff size={16} /> : <Shield size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
};

export default UsersPage;
