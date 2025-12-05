import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { FolderOpen, Users, FileText, Target, Check, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { endpoints } from '../api';
import { DashboardStats } from '../types';
import { Card, StatCard, LoadingSpinner } from '../components/ui';

const Dashboard: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  // Sample chart data
  const progressData = [
    { name: 'Education', completed: 85, target: 100 },
    { name: 'Health', completed: 65, target: 100 },
    { name: 'Livelihood', completed: 45, target: 100 },
    { name: 'Agriculture', completed: 72, target: 100 },
  ];

  const monthlyData = [
    { month: 'Jan', interviews: 45 },
    { month: 'Feb', interviews: 62 },
    { month: 'Mar', interviews: 78 },
    { month: 'Apr', interviews: 95 },
    { month: 'May', interviews: 110 },
    { month: 'Jun', interviews: 125 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your impact assessment activities</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Projects" 
          value={stats?.total_projects ?? 0} 
          icon={FolderOpen} 
          color="emerald"
          onClick={() => navigate('/projects')}
        />
        <StatCard 
          title="Active Projects" 
          value={stats?.active_projects ?? 0} 
          icon={Target} 
          color="blue"
          onClick={() => navigate('/projects')}
        />
        <StatCard 
          title="Field Resources" 
          value={stats?.field_resources ?? 0} 
          icon={Users} 
          color="purple"
          onClick={() => navigate('/resources')}
        />
        <StatCard 
          title="Total Interviews" 
          value={stats?.total_responses ?? 0} 
          icon={FileText} 
          color="amber"
          onClick={() => navigate('/interviews')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Interview Progress by Sector</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Interviews Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="interviews" 
                stroke="#10b981" 
                fill="#d1fae5" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { action: 'Interview completed', project: 'Education Grant 2024', time: '2 hours ago', icon: Check },
            { action: 'New resource assigned', project: 'Health Initiative', time: '4 hours ago', icon: UserCheck },
            { action: 'Report generated', project: 'Livelihood Support', time: '1 day ago', icon: FileText },
            { action: 'Project created', project: 'Agriculture Support', time: '2 days ago', icon: FolderOpen },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <item.icon className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.action}</p>
                <p className="text-sm text-gray-500">{item.project}</p>
              </div>
              <span className="text-sm text-gray-400">{item.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
