import React, { useMemo } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { OverviewPanel } from '../components/dashboard/OverviewPanel';
import UserTrading from './UserTrading';
import Community from './Community';
import Settings from './Settings';
import { ReportsView } from '../components/dashboard/ReportsView';
import { Toaster } from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';

  // Memoize the content to prevent unnecessary re-renders
  const content = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPanel />;
      case 'trading':
        return <UserTrading />;
      case 'community':
        return <Community />;
      case 'settings':
        return <Settings />;
      case 'reports':
        return <ReportsView />;
      default:
        return <Navigate to="/user/dashboard?tab=overview" replace />;
    }
  }, [activeTab]);

  return (
    <>
      <Toaster position="top-right" />
      <div className="h-full relative">
        {content}
      </div>
    </>
  );
};

export default Dashboard;
