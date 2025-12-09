import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, CheckCircle, Clock, MapPin } from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, StatCard, LoadingSpinner } from '../../components/ui';

const FieldResourceDashboard: React.FC = () => {
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
        <h1 className="text-2xl font-bold text-gray-900">Field Resource Dashboard</h1>
        <p className="text-gray-500 mt-1">Your assignments and field activities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="My Assignments" value={0} icon={Target} color="emerald" onClick={() => navigate('/my-assignments')} />
        <StatCard title="Completed" value={0} icon={CheckCircle} color="blue" onClick={() => navigate('/my-assignments')} />
        <StatCard title="Pending" value={0} icon={Clock} color="amber" onClick={() => navigate('/my-assignments')} />
        <StatCard title="Attendance" value={0} icon={MapPin} color="purple" onClick={() => navigate('/attendance')} />
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Field Activities</h3>
        <p className="text-gray-600">View assignments, mark attendance, and submit interviews</p>
      </Card>
    </div>
  );
};

export default FieldResourceDashboard;
