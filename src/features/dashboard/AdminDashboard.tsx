import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FolderOpen, Users, FileText, Target } from 'lucide-react';
import api, { endpoints } from '../../api';
import { DashboardStats } from '../../types';
import { Card, StatCard, LoadingSpinner } from '../../components/ui';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.get<DashboardStats>(endpoints.dashboardStats);
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
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Complete system overview and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Projects" value={stats?.total_projects ?? 0} icon={FolderOpen} color="emerald" onClick={() => navigate('/projects')} />
        <StatCard title="Active Projects" value={stats?.active_projects ?? 0} icon={Target} color="blue" onClick={() => navigate('/projects')} />
        <StatCard title="Field Resources" value={stats?.field_resources ?? 0} icon={Users} color="purple" onClick={() => navigate('/resources')} />
        <StatCard title="Total Interviews" value={stats?.total_responses ?? 0} icon={FileText} color="amber" onClick={() => navigate('/interviews')} />
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">System Overview</h3>
        <p className="text-gray-600">Full access to all modules and settings</p>
      </Card>
    </div>
  );
};

export default AdminDashboard;
