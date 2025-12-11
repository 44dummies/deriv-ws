import React from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

const AdminLayout: React.FC = () => {
    return (
        <DashboardLayout isAdmin={true}>
            <Outlet />
        </DashboardLayout>
    );
};

export default AdminLayout;


