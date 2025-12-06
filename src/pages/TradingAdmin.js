import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';
import AdminControlPanel from '../components/trading/AdminControlPanel';
import '../styles/TradingAdmin.css';

const TradingAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const derivId = sessionStorage.getItem('derivId');
      
      if (!derivId) {
        navigate('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('deriv_id', derivId)
        .single();

      if (error) throw error;

      if (!profile?.is_admin) {
        // Not an admin, redirect to dashboard
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="trading-admin-loading">
        <div className="loading-spinner"></div>
        <p>Verifying admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="trading-admin-page">
      <div className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <button className="back-button" onClick={() => navigate('/dashboard')}>
              ← Back to Dashboard
            </button>
            <h1>⚡ Trading Administration</h1>
          </div>
          <div className="header-right">
            <span className="admin-badge">Admin Access</span>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <AdminControlPanel />
      </div>
    </div>
  );
};

export default TradingAdmin;
