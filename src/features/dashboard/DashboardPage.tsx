import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import AnalystDashboard from './AnalystDashboard';
import FieldResourceDashboard from './FieldResourceDashboard';
import ClientDashboard from './ClientDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'admin';

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'analyst':
      return <AnalystDashboard />;
    case 'field_resource':
      return <FieldResourceDashboard />;
    case 'client':
      return <ClientDashboard />;
    default:
      return <AdminDashboard />;
  }
};

export default Dashboard;
