import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Play, Target, Shield, Coins, Zap } from 'lucide-react';
import apiClient from '../../services/apiClient';

const CreateSession = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        session_type: 'standard', // standard | recovery
        min_balance: 100,
        initial_stake: 0.35,
        stake_percentage: 1.5,
        default_tp: 10,
        default_sl: 10,
        martingale_multiplier: 2.1,
        max_consecutive_losses: 4,
        description: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Basic validation
            if (!formData.name) throw new Error('Session name is required');
            if (formData.min_balance < 0) throw new Error('Minimum balance cannot be negative');

            await apiClient.post('/admin/sessions', formData);
            toast.success('Session created successfully!');
            navigate('/admin/dashboard');
        } catch (error) {
            console.error('Create session error:', error);
            toast.error(error.message || 'Failed to create session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </button>

                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Create New Session
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info Card */}
                    <div className="p-6 rounded-2xl bg-[#14141a] border border-white/5">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-blue-400" />
                            Session Details
                        </h3>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Session Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500/50 outline-none transition"
                                    placeholder="e.g. Morning Scalp"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Session Type</label>
                                <select
                                    name="session_type"
                                    value={formData.session_type}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500/50 outline-none transition"
                                >
                                    <option value="standard">Standard Session</option>
                                    <option value="recovery">Recovery Protocol</option>
                                </select>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <label className="text-sm text-gray-400">Description (Optional)</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500/50 outline-none transition h-24 resize-none"
                                    placeholder="Brief plan for this session..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Risk Management Card */}
                    <div className="p-6 rounded-2xl bg-[#14141a] border border-white/5">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-green-400" />
                            Risk Parameters
                        </h3>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Min Balance Required ($)</label>
                                <input
                                    type="number"
                                    name="min_balance"
                                    value={formData.min_balance}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-green-500/50 outline-none transition"
                                    min="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Initial Stake ($)</label>
                                <input
                                    type="number"
                                    name="initial_stake"
                                    value={formData.initial_stake}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-green-500/50 outline-none transition"
                                    min="0.35"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bot Config Card */}
                    <div className="p-6 rounded-2xl bg-[#14141a] border border-white/5">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Target className="w-5 h-5 text-purple-400" />
                            Bot Configuration
                        </h3>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Default Take Profit ($)</label>
                                <input
                                    type="number"
                                    name="default_tp"
                                    value={formData.default_tp}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-purple-500/50 outline-none transition"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Default Stop Loss ($)</label>
                                <input
                                    type="number"
                                    name="default_sl"
                                    value={formData.default_sl}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-purple-500/50 outline-none transition"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Martingale Multiplier</label>
                                <input
                                    type="number"
                                    name="martingale_multiplier"
                                    value={formData.martingale_multiplier}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-purple-500/50 outline-none transition"
                                    step="0.1"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Max Consecutive Losses</label>
                                <input
                                    type="number"
                                    name="max_consecutive_losses"
                                    value={formData.max_consecutive_losses}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-purple-500/50 outline-none transition"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Create Session
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSession;
