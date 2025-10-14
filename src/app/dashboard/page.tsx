'use client';

import ManagerDashboard from '@/components/dashboards/ManagerDashboard';
import { useAuth } from '@/providers/AuthProvider';
import { Spin, Alert } from 'antd';

const DashboardPage = () => {
  const { roles, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  // Assuming navbar already prevents non-managers from reaching this page, 
  // but as a fallback, we can check the role.
  const isManager = roles.includes('Quản lý');

  if (isManager) {
    return <ManagerDashboard />;
  }

  // Fallback for other roles if they somehow land here, render nothing.
  return null;
};

export default DashboardPage;