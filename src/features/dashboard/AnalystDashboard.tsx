import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, BarChart3, TrendingUp, Database } from 'lucide-react';
import api, { endpoints } from '../../api';
import { DashboardStats } from '../../types';
import { Card, StatCard, LoadingSpinner } from '../../components/ui';

const AnalystDashboard: React.FC = () => {
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
        <h1 className="text-2xl font-bold text-gray-900">Data Analyst Dashboard</h1>
        <p className="text-gray-500 mt-1">Analyze data and generate insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Responses" value={stats?.total_responses ?? 0} icon={FileText} color="emerald" onClick={() => navigate('/interviews')} />
        <StatCard title="Data Points" value={stats?.total_responses ?? 0} icon={Database} color="blue" onClick={() => navigate('/beneficiaries')} />
        <StatCard title="Reports" value={0} icon={BarChart3} color="purple" onClick={() => navigate('/reports')} />
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Data Analysis</h3>
        <p className="text-gray-600">Access data, generate reports, and analyze trends</p>
      </Card>
    </div>
  );
};

export default AnalystDashboard;
