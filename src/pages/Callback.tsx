import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authFlowService } from '../services/authFlow';
import { Logo } from '../components/ui/Logo';

const Callback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, failAuth } = useAuth();

  const [status, setStatus] = useState('Authenticating...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const runAuth = async () => {
      // Direct handoff to the singleton service
      const result = await authFlowService.handleCallback(searchParams, login);

      if (!mounted) return;

      if (result.success && result.redirectTo) {
        setStatus('Success! Redirecting...');
        // Instant redirect (Optimistic)
        navigate(result.redirectTo, { replace: true });
      } else {
        setStatus('Authentication Failed');
        setError(result.error || 'Unknown error');
        failAuth();
      }
    };

    runAuth();

    return () => { mounted = false; };
  }, [searchParams, login, failAuth, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full text-center border border-red-500/30">
          <div className="mx-auto mb-4 w-16 h-16 text-red-500">❌</div>
          <h2 className="text-xl font-bold mb-2">Login Failed</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
      <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-8">
          <Logo className="h-16 w-auto" />
        </div>

        <div className="relative">
          {/* Modern Spinner */}
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Verifying</h2>
          <p className="text-gray-400">{status}</p>
        </div>
      </div>
    </div>
  );
};

export default Callback;
