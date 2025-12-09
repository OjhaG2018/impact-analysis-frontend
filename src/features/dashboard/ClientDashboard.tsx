import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, TrendingUp, FileText, Eye } from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, StatCard, LoadingSpinner } from '../../components/ui';

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.get<any>(endpoints.dashboardStats);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Dashboard</h1>
        <p className="text-gray-500 mt-1">View your projects and reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="My Projects" value={0} icon={FolderOpen} color="emerald" onClick={() => navigate('/projects')} />
        <StatCard title="Progress" value="0%" icon={TrendingUp} color="blue" />
        <StatCard title="Reports" value={0} icon={FileText} color="purple" onClick={() => navigate('/reports')} />
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Project Overview</h3>
        <p className="text-gray-600">Monitor project progress and access reports</p>
      </Card>
    </div>
  );
};

export default ClientDashboard;
