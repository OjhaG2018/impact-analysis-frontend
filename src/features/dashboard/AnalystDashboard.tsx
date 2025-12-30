import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Database,
  Video,
  AudioLines,
  Brain,
  Mic,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Layers,
  GitBranch,
  Zap,
  Target,
  Users,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Smile,
  Frown,
  Heart,
  Sparkles,
  FolderOpen,
  Calendar,
  Globe,
  FileBarChart,
  Table2,
  Share2
} from 'lucide-react';
import api, { endpoints, videoAnalysisApi, audioAnalysisApi, sentimentAnalysisApi } from '../../api';
import { DashboardStats } from '../../types';
import { Card, StatCard, LoadingSpinner } from '../../components/ui';

// Metric Card with Trend
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, value, change, changeLabel, icon: Icon, color, bgColor, onClick 
}) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : isNegative ? <ArrowDownRight className="h-4 w-4" /> : null}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
      {changeLabel && <p className="text-xs text-gray-400 mt-1">{changeLabel}</p>}
    </div>
  );
};

// Analysis Tool Card
interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  path: string;
  stats?: { label: string; value: number | string }[];
  badge?: string;
  badgeColor?: string;
}

const ToolCard: React.FC<ToolCardProps> = ({ 
  title, description, icon: Icon, color, bgColor, path, stats, badge, badgeColor 
}) => {
  const navigate = useNavigate();
  
  return (
    <div 
      onClick={() => navigate(path)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-xl ${bgColor} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        {badge && (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeColor || 'bg-blue-100 text-blue-700'}`}>
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 mb-3">{description}</p>
      {stats && stats.length > 0 && (
        <div className="flex gap-4 pt-3 border-t border-gray-100">
          {stats.map((stat, idx) => (
            <div key={idx}>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center text-sm text-blue-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Open</span>
        <ArrowRight className="h-4 w-4 ml-1" />
      </div>
    </div>
  );
};

// Insight Card
interface InsightCardProps {
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  metric?: string;
}

const InsightCard: React.FC<InsightCardProps> = ({ title, description, type, metric }) => {
  const styles = {
    positive: { bg: 'bg-green-50', border: 'border-green-200', icon: ThumbsUp, iconColor: 'text-green-600' },
    negative: { bg: 'bg-red-50', border: 'border-red-200', icon: ThumbsDown, iconColor: 'text-red-600' },
    neutral: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Activity, iconColor: 'text-blue-600' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600' }
  };
  
  const style = styles[type];
  const Icon = style.icon;
  
  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${style.iconColor} mt-0.5`} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">{title}</h4>
            {metric && <span className="text-sm font-semibold text-gray-700">{metric}</span>}
          </div>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
};

const AnalystDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoStats, setVideoStats] = useState({ total: 0, pending: 0, completed: 0, needsReview: 0 });
  const [audioStats, setAudioStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [sentimentData, setSentimentData] = useState<any[]>([]);
  const [emotionData, setEmotionData] = useState<any[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load dashboard stats
      const data = await api.get<DashboardStats>(endpoints.dashboardStats);
      setStats(data);

      // Load video stats
      try {
        const videos = await videoAnalysisApi.getVideoList({ page_size: 1000 });
        if (videos?.results) {
          const total = videos.results.length;
          const pending = videos.results.filter((v: any) => v.analysis_status === 'pending').length;
          const completed = videos.results.filter((v: any) => v.analysis_status === 'completed').length;
          setVideoStats({ total, pending, completed, needsReview: Math.floor(completed * 0.15) });
        }
      } catch (e) {
        console.log('Video stats not available');
      }

      // Load audio stats
      try {
        const audio = await audioAnalysisApi.getAudioList({ page_size: 1000 });
        if (audio?.results) {
          const total = audio.results.length;
          const pending = audio.results.filter((a: any) => a.analysis_status === 'pending').length;
          const completed = audio.results.filter((a: any) => a.analysis_status === 'completed').length;
          setAudioStats({ total, pending, completed });
        }
      } catch (e) {
        console.log('Audio stats not available');
      }

      // Generate sentiment distribution data
      setSentimentData([
        { name: 'Very Positive', value: 28, color: '#10B981' },
        { name: 'Positive', value: 35, color: '#34D399' },
        { name: 'Neutral', value: 20, color: '#9CA3AF' },
        { name: 'Negative', value: 12, color: '#F59E0B' },
        { name: 'Very Negative', value: 5, color: '#EF4444' }
      ]);

      // Generate emotion distribution data
      setEmotionData([
        { emotion: 'Joy', value: 85 },
        { emotion: 'Trust', value: 72 },
        { emotion: 'Anticipation', value: 65 },
        { emotion: 'Surprise', value: 45 },
        { emotion: 'Sadness', value: 25 },
        { emotion: 'Fear', value: 18 },
        { emotion: 'Anger', value: 12 },
        { emotion: 'Disgust', value: 8 }
      ]);

    } catch (error) {
      console.error('Error loading stats:', error);
    }
    setLoading(false);
  };

  // Trend data for line chart
  const trendData = [
    { month: 'Jan', responses: 45, sentiment: 0.65 },
    { month: 'Feb', responses: 52, sentiment: 0.68 },
    { month: 'Mar', responses: 48, sentiment: 0.62 },
    { month: 'Apr', responses: 70, sentiment: 0.71 },
    { month: 'May', responses: 85, sentiment: 0.74 },
    { month: 'Jun', responses: 92, sentiment: 0.78 }
  ];

  // Analysis pipeline data
  const pipelineData = [
    { stage: 'Uploaded', video: videoStats.total, audio: audioStats.total },
    { stage: 'Processing', video: videoStats.pending, audio: audioStats.pending },
    { stage: 'Completed', video: videoStats.completed, audio: audioStats.completed }
  ];

  const COLORS = ['#10B981', '#34D399', '#9CA3AF', '#F59E0B', '#EF4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Analyst Dashboard</h1>
          <p className="text-gray-500 mt-1">Analyze data, generate insights, and create reports</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>
          <button 
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Export Data
          </button>
          <button 
            onClick={loadAllData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Responses"
          value={stats?.total_responses ?? 0}
          change={12}
          changeLabel="vs last month"
          icon={FileText}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          onClick={() => navigate('/interviews')}
        />
        <MetricCard
          title="Videos Analyzed"
          value={videoStats.completed}
          change={8}
          icon={Video}
          color="text-blue-600"
          bgColor="bg-blue-50"
          onClick={() => navigate('/video-analysis')}
        />
        <MetricCard
          title="Audio Analyzed"
          value={audioStats.completed}
          change={15}
          icon={AudioLines}
          color="text-purple-600"
          bgColor="bg-purple-50"
          onClick={() => navigate('/audio-analysis')}
        />
        <MetricCard
          title="Avg. Sentiment"
          value="0.72"
          change={5}
          icon={Smile}
          color="text-green-600"
          bgColor="bg-green-50"
          onClick={() => navigate('/sentiment-analysis')}
        />
        <MetricCard
          title="Needs Review"
          value={videoStats.needsReview}
          change={-20}
          icon={AlertTriangle}
          color="text-amber-600"
          bgColor="bg-amber-50"
          onClick={() => navigate('/video-analysis')}
        />
        <MetricCard
          title="Active Projects"
          value={stats?.active_projects ?? 0}
          icon={FolderOpen}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
          onClick={() => navigate('/projects')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Distribution Pie Chart */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-gray-400" />
              Sentiment Distribution
            </h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Details</button>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Response Trend Line Chart */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-gray-400" />
              Response & Sentiment Trends
            </h3>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Last 6 Months</option>
              <option>Last Year</option>
              <option>All Time</option>
            </select>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 1]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" dataKey="responses" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} name="Responses" />
                <Line yAxisId="right" type="monotone" dataKey="sentiment" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name="Avg Sentiment" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Analysis Tools Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-gray-400" />
          Analysis Tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ToolCard
            title="Video Analysis"
            description="AI-powered video sentiment and emotion detection"
            icon={Video}
            color="text-red-600"
            bgColor="bg-red-50"
            path="/video-analysis"
            stats={[
              { label: 'Analyzed', value: videoStats.completed },
              { label: 'Pending', value: videoStats.pending }
            ]}
            badge="AI"
            badgeColor="bg-red-100 text-red-700"
          />
          <ToolCard
            title="Audio Analysis"
            description="Transcription with GPT-4 summaries"
            icon={AudioLines}
            color="text-violet-600"
            bgColor="bg-violet-50"
            path="/audio-analysis"
            stats={[
              { label: 'Analyzed', value: audioStats.completed },
              { label: 'Pending', value: audioStats.pending }
            ]}
            badge="AI"
            badgeColor="bg-violet-100 text-violet-700"
          />
          <ToolCard
            title="Sentiment Analysis"
            description="Deep sentiment insights from all modalities"
            icon={Brain}
            color="text-pink-600"
            bgColor="bg-pink-50"
            path="/sentiment-analysis"
            badge="AI"
            badgeColor="bg-pink-100 text-pink-700"
          />
          <ToolCard
            title="Analytics Dashboard"
            description="Cross-tabulation and advanced analytics"
            icon={BarChart3}
            color="text-blue-600"
            bgColor="bg-blue-50"
            path="/analytics"
            badge="Insights"
            badgeColor="bg-blue-100 text-blue-700"
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Emotion Radar Chart */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-gray-400" />
            Emotion Analysis
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={emotionData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="emotion" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Intensity" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Middle: Analysis Pipeline */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-gray-400" />
            Analysis Pipeline
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="stage" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="video" fill="#EF4444" name="Video" radius={[0, 4, 4, 0]} />
                <Bar dataKey="audio" fill="#8B5CF6" name="Audio" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right: Key Insights */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gray-400" />
            Key Insights
          </h3>
          <div className="space-y-3">
            <InsightCard
              title="Positive Trend"
              description="Overall sentiment improved by 8% this month"
              type="positive"
              metric="+8%"
            />
            <InsightCard
              title="High Engagement"
              description="Joy is the dominant emotion in 65% of responses"
              type="positive"
              metric="65%"
            />
            <InsightCard
              title="Review Required"
              description={`${videoStats.needsReview} analyses flagged for manual review`}
              type="warning"
              metric={`${videoStats.needsReview}`}
            />
            <InsightCard
              title="Processing Queue"
              description={`${videoStats.pending + audioStats.pending} files pending analysis`}
              type="neutral"
              metric={`${videoStats.pending + audioStats.pending}`}
            />
          </div>
        </Card>
      </div>

      {/* Data Access Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-gray-400" />
          Data Access
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/interviews')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
                <MessageSquare className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">Interview Responses</h3>
                <p className="text-sm text-gray-500">{stats?.total_responses ?? 0} total responses</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/beneficiaries')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Beneficiaries</h3>
                <p className="text-sm text-gray-500">View all participants</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/projects')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-xl group-hover:scale-110 transition-transform">
                <FolderOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">Projects</h3>
                <p className="text-sm text-gray-500">{stats?.total_projects ?? 0} projects</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/questionnaires')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform">
                <Table2 className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">Questionnaires</h3>
                <p className="text-sm text-gray-500">Survey templates</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Actions & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-gray-400" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate('/video-analysis/upload')}
              className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
            >
              <Video className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-gray-700">Upload Videos</span>
            </button>
            <button 
              onClick={() => navigate('/audio-analysis')}
              className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
            >
              <AudioLines className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">Upload Audio</span>
            </button>
            <button 
              onClick={() => videoAnalysisApi.triggerBulkAnalysis({ analyze_all_pending: true })}
              className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
            >
              <RefreshCw className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Bulk Analyze</span>
            </button>
            <button 
              onClick={() => {}}
              className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
            >
              <Download className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">Export Report</span>
            </button>
            <button 
              onClick={() => navigate('/sentiment-analysis')}
              className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
            >
              <Eye className="h-5 w-5 text-pink-500" />
              <span className="text-sm font-medium text-gray-700">Review Flagged</span>
            </button>
            <button 
              onClick={() => {}}
              className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
            >
              <Share2 className="h-5 w-5 text-indigo-500" />
              <span className="text-sm font-medium text-gray-700">Share Insights</span>
            </button>
          </div>
        </Card>

        {/* Recent Reports */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-gray-400" />
              Recent Reports
            </h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Q4 Sentiment Analysis Report', date: 'Dec 20, 2025', type: 'Sentiment' },
              { name: 'Rural Health Survey - Final', date: 'Dec 18, 2025', type: 'Survey' },
              { name: 'Education Impact Assessment', date: 'Dec 15, 2025', type: 'Impact' },
              { name: 'Weekly Analytics Summary', date: 'Dec 14, 2025', type: 'Analytics' }
            ].map((report, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.name}</p>
                    <p className="text-xs text-gray-500">{report.date}</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-white border border-gray-200 rounded-full text-gray-600">
                  {report.type}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Help Footer */}
      <Card className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Need Advanced Analysis?</h3>
            <p className="text-sm text-gray-600">Use cross-tabulation and custom filters for deeper insights</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/analytics')}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Analytics Dashboard
            </button>
            <button 
              className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Generate Report
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalystDashboard;