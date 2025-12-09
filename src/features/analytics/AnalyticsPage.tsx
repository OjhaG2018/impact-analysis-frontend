import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Download, Users, FileText, Target, TrendingUp } from 'lucide-react';
import api, { endpoints } from '../../api';
import { Project, ProjectAnalytics, PaginatedResponse } from '../../types';
import { Card, Button, Select, StatCard, ProgressBar, LoadingSpinner } from '../../components/ui';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const AnalyticsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await api.get<PaginatedResponse<Project> | Project[]>(endpoints.projects);
      setProjects(Array.isArray(data) ? data : data.results);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const loadAnalytics = async (projectId: number) => {
    setAnalyticsLoading(true);
    try {
      const data = await api.get<ProjectAnalytics>(endpoints.projectAnalytics(projectId));
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    setAnalyticsLoading(false);
  };

  useEffect(() => {
    if (selectedProject) {
      loadAnalytics(selectedProject.id);
    }
  }, [selectedProject]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const project = projects.find(p => p.id === parseInt(e.target.value));
    setSelectedProject(project || null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const projectOptions = [
    { value: '', label: 'Choose a project...' },
    ...projects.map(p => ({ value: p.id, label: `${p.code} - ${p.title}` }))
  ];

  const genderData = analytics?.demographics?.gender 
    ? Object.entries(analytics.demographics.gender).map(([name, value]) => ({ name, value }))
    : [];

  const scoreData = analytics?.impact_metrics?.score_distribution
    ? Object.entries(analytics.impact_metrics.score_distribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-gray-500 mt-1">Generate insights and export reports</p>
      </div>

      <Card className="p-4">
        <Select
          label="Select Project"
          options={projectOptions}
          onChange={handleProjectChange}
        />
      </Card>

      {analyticsLoading && (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      )}

      {analytics && !analyticsLoading && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard 
              title="Total Beneficiaries" 
              value={analytics.sampling_progress?.total_beneficiaries ?? 0}
              icon={Users}
              color="emerald"
            />
            <StatCard 
              title="Interviews Completed" 
              value={analytics.sampling_progress?.interviewed ?? 0}
              icon={FileText}
              color="blue"
            />
            <StatCard 
              title="Completion Rate" 
              value={`${analytics.sampling_progress?.completion_percentage ?? 0}%`}
              icon={Target}
              color="purple"
            />
            <StatCard 
              title="Avg Impact Score" 
              value={analytics.impact_metrics?.average_impact_score ?? 'N/A'}
              icon={TrendingUp}
              color="amber"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender Distribution */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Gender Distribution</h3>
              {genderData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {genderData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </Card>

            {/* Score Distribution */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Impact Score Distribution</h3>
              {scoreData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={scoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </Card>
          </div>

          {/* Geographic Distribution */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Geographic Distribution</h3>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" /> Export Report
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 text-sm font-semibold text-gray-600">District</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-600">Beneficiaries</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-600">Interviewed</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-600">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.geographic_distribution?.by_district ?? []).map((dist, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-3">{dist.district || 'Unknown'}</td>
                      <td className="text-right py-3">{dist.count}</td>
                      <td className="text-right py-3">{dist.interviewed}</td>
                      <td className="text-right py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20">
                            <ProgressBar value={dist.interviewed} max={dist.count} />
                          </div>
                          <span className="text-sm text-gray-500 w-12">
                            {dist.count > 0 ? Math.round((dist.interviewed / dist.count) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(analytics.geographic_distribution?.by_district ?? []).length === 0 && (
                <div className="text-center py-8 text-gray-500">No geographic data available</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {!selectedProject && !loading && (
        <Card className="p-12 text-center">
          <p className="text-gray-500">Select a project to view analytics</p>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsPage;
