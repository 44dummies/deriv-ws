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
      
      console.log('[Admin Check] Deriv ID:', derivId);
      
      if (!derivId) {
        console.log('[Admin Check] No derivId, redirecting to login');
        navigate('/');
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('deriv_account_id', derivId)
        .single();

      console.log('[Admin Check] Profile data:', profile);
      console.log('[Admin Check] Error:', error);
      console.log('[Admin Check] is_admin value:', profile?.is_admin);

      if (error) {
        console.error('[Admin Check] Supabase error:', error);
        throw error;
      }

      if (!profile?.is_admin) {
        console.log('[Admin Check] Not admin, redirecting to trading');
        // Not an admin, redirect to trading dashboard
        navigate('/trading');
        return;
      }

      console.log('[Admin Check] Admin verified! Setting isAdmin to true');
      setIsAdmin(true);
    } catch (error) {
      console.error('[Admin Check] Error checking admin access:', error);
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
