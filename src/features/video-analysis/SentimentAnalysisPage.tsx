/**
 * SentimentAnalysisPage.tsx
 * Admin page for viewing and managing video sentiment analyses.
 * Displays polarity, emotions, authenticity, and narrative insights.
 * Place in: frontend/src/features/video-analysis/SentimentAnalysisPage.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Brain, RefreshCw, Zap, Eye, TrendingUp, TrendingDown, Minus,
  Heart, Shield, MessageSquare, AlertTriangle, CheckCircle, Clock,
  BarChart3, PieChart, Target, FileText, Play, Trash2, Filter,
  ChevronDown, ChevronUp, Smile, Frown, Meh, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner, Modal, Select } from '../../components/ui';
import api, { sentimentAnalysisApi, SentimentAnalysis, SentimentAnalysisSummary, SentimentAnalyticsData, ProjectSentimentSummary } from '../../api';

// ==================== TYPES ====================

interface Project {
  id: number;
  code: string;
  title: string;
}

// ==================== HELPER COMPONENTS ====================

const DataRow: React.FC<{ label: string; value: any; icon?: React.ReactNode }> = ({ label, value, icon }) => {
  if (value === undefined || value === null || value === '') return null;
  
  const displayValue = typeof value === 'boolean' 
    ? (value ? '✓ Yes' : '✗ No')
    : typeof value === 'number' 
      ? (value < 1 && value > 0 ? `${(value * 100).toFixed(0)}%` : value.toFixed?.(2) || value)
      : String(value).replace(/_/g, ' ');
  
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="font-medium text-gray-900 text-sm">{displayValue}</span>
    </div>
  );
};

const AnalysisSection: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  bgColor: string; 
  children: React.ReactNode;
  collapsible?: boolean;
}> = ({ title, icon, bgColor, children, collapsible = false }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div className={`${bgColor} rounded-lg p-4`}>
      <h4 
        className={`font-semibold text-gray-800 mb-3 flex items-center justify-between ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        {collapsible && (isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
      </h4>
      {isOpen && <div>{children}</div>}
    </div>
  );
};

// Polarity indicator component
const PolarityIndicator: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const getColor = () => {
    if (score >= 0.3) return 'text-green-600 bg-green-100';
    if (score >= 0.1) return 'text-green-500 bg-green-50';
    if (score > -0.1) return 'text-gray-600 bg-gray-100';
    if (score > -0.3) return 'text-orange-500 bg-orange-50';
    return 'text-red-600 bg-red-100';
  };
  
  const getIcon = () => {
    if (score >= 0.1) return <TrendingUp className="w-5 h-5" />;
    if (score > -0.1) return <Minus className="w-5 h-5" />;
    return <TrendingDown className="w-5 h-5" />;
  };
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${getColor()}`}>
      {getIcon()}
      <span className="font-semibold">{(score * 100).toFixed(0)}%</span>
      <span className="text-sm">{label.replace(/_/g, ' ')}</span>
    </div>
  );
};

// Emotion badge component
const EmotionBadge: React.FC<{ emotion: string; confidence?: number; size?: 'sm' | 'md' }> = ({ 
  emotion, 
  confidence,
  size = 'md' 
}) => {
  const emotionConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    joy: { icon: <Smile className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-700' },
    sadness: { icon: <Frown className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
    anger: { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-100 text-red-700' },
    fear: { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
    surprise: { icon: <Eye className="w-4 h-4" />, color: 'bg-pink-100 text-pink-700' },
    trust: { icon: <ThumbsUp className="w-4 h-4" />, color: 'bg-green-100 text-green-700' },
    anticipation: { icon: <Clock className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700' },
    disgust: { icon: <ThumbsDown className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700' },
    neutral: { icon: <Meh className="w-4 h-4" />, color: 'bg-gray-100 text-gray-600' },
  };
  
  const config = emotionConfig[emotion.toLowerCase()] || emotionConfig.neutral;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${config.color} ${sizeClass}`}>
      {config.icon}
      <span className="capitalize">{emotion}</span>
      {confidence !== undefined && (
        <span className="opacity-75">({(confidence * 100).toFixed(0)}%)</span>
      )}
    </span>
  );
};

// Score bar component
const ScoreBar: React.FC<{ label: string; score: number; color: string }> = ({ label, score, color }) => (
  <div className="mb-2">
    <div className="flex justify-between text-sm mb-1">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{(score * 100).toFixed(0)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${Math.abs(score) * 100}%` }}
      />
    </div>
  </div>
);

// ==================== MAIN COMPONENT ====================

const SentimentAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [analyses, setAnalyses] = useState<SentimentAnalysisSummary[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SentimentAnalysis | null>(null);
  const [analytics, setAnalytics] = useState<SentimentAnalyticsData | null>(null);
  const [projectSummary, setProjectSummary] = useState<ProjectSentimentSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState<number | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || 'all',
    polarity: searchParams.get('polarity') || 'all',
    emotion: searchParams.get('emotion') || 'all',
    project_id: searchParams.get('project_id') || '',
    needs_review: searchParams.get('needs_review') === 'true',
  });
  
  const [showFilters, setShowFilters] = useState(false);

  // ==================== DATA FETCHING ====================

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.polarity !== 'all') params.polarity = filters.polarity;
      if (filters.emotion !== 'all') params.emotion = filters.emotion;
      if (filters.project_id) params.project_id = filters.project_id;
      if (filters.needs_review) params.needs_review = true;
      
      const response = await sentimentAnalysisApi.getAnalyses(params);
      const data = Array.isArray(response) ? response : (response.results || []);
      setAnalyses(data);
    } catch (err: any) {
      console.error('Error fetching analyses:', err);
      setError(err.message || 'Failed to load sentiment analyses');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      const data = await sentimentAnalysisApi.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get<{ results: Project[] } | Project[]>('/projects/');
      const data = Array.isArray(response) ? response : (response.results || []);
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchProjectSummary = async (projectId: number) => {
    try {
      const data = await sentimentAnalysisApi.getProjectSummary(projectId);
      setProjectSummary(data);
    } catch (err) {
      console.error('Error fetching project summary:', err);
    }
  };

  const fetchAnalysisDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const data = await sentimentAnalysisApi.getAnalysis(id);
      setSelectedAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis details');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
    fetchAnalytics();
    fetchProjects();
  }, [fetchAnalyses]);

  useEffect(() => {
    if (filters.project_id) {
      fetchProjectSummary(parseInt(filters.project_id));
    } else {
      setProjectSummary(null);
    }
  }, [filters.project_id]);

  // ==================== ACTIONS ====================

  const triggerAnalysis = async (videoId: number) => {
    setIsAnalyzing(videoId);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await sentimentAnalysisApi.analyzeVideo({
        video_id: videoId,
        analysis_type: 'full'
      });
      
      if (response.success) {
        setSuccess(`✅ ${response.message || 'Sentiment analysis completed'}`);
        await fetchAnalyses();
        await fetchAnalytics();
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to trigger analysis');
    } finally {
      setIsAnalyzing(null);
    }
  };

  const triggerBulkAnalysis = async () => {
    const pendingCount = analytics?.summary.pending || 0;
    if (pendingCount === 0) {
      setError('No pending analyses to process');
      return;
    }
    
    setError(null);
    setSuccess(`Starting bulk analysis...`);
    
    try {
      const response = await sentimentAnalysisApi.bulkAnalyze({
        analyze_all_pending: true
      });
      
      setSuccess(`✅ Bulk analysis complete: ${response.successful} succeeded, ${response.failed} failed`);
      await fetchAnalyses();
      await fetchAnalytics();
    } catch (err: any) {
      setError(err.message || 'Bulk analysis failed');
    }
  };

  const markAsReviewed = async () => {
    if (!selectedAnalysisId) return;
    
    try {
      await sentimentAnalysisApi.reviewAnalysis(selectedAnalysisId, {
        notes: reviewNotes,
        clear_review_flag: true
      });
      
      setShowReviewModal(false);
      setReviewNotes('');
      setSelectedAnalysisId(null);
      setSuccess('Analysis marked as reviewed');
      await fetchAnalyses();
      await fetchAnalytics();
    } catch (err: any) {
      setError(err.message || 'Failed to mark as reviewed');
    }
  };

  const deleteAnalysis = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this analysis?')) return;
    
    try {
      await sentimentAnalysisApi.deleteAnalysis(id);
      setSuccess('Analysis deleted successfully');
      setSelectedAnalysis(null);
      await fetchAnalyses();
      await fetchAnalytics();
    } catch (err: any) {
      setError(err.message || 'Failed to delete analysis');
    }
  };

  // ==================== HELPERS ====================

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
      pending: 'warning',
      processing: 'info',
      completed: 'success',
      failed: 'danger',
      partial: 'warning'
    };
    return variants[status] || 'warning';
  };

  const getPolarityColor = (score: number) => {
    if (score >= 0.3) return 'text-green-600';
    if (score >= 0.1) return 'text-green-500';
    if (score > -0.1) return 'text-gray-600';
    if (score > -0.3) return 'text-orange-500';
    return 'text-red-600';
  };

  const getPolarityBg = (score: number) => {
    if (score >= 0.3) return 'bg-green-100';
    if (score >= 0.1) return 'bg-green-50';
    if (score > -0.1) return 'bg-gray-100';
    if (score > -0.3) return 'bg-orange-50';
    return 'bg-red-100';
  };

  const updateFilters = (key: string, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v && v !== 'all' && v !== '') {
        params.set(k, String(v));
      }
    });
    setSearchParams(params);
  };

  // Stats
  const stats = {
    total: analytics?.summary?.total_analyses || 0,
    completed: analytics?.summary?.completed || 0,
    pending: analytics?.summary?.pending || 0,
    needsReview: analytics?.summary?.requires_review || 0,
    avgSentiment: analytics?.sentiment_trends?.overall_average || 0,
  };

  // ==================== RENDER ====================

  if (loading && analyses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <Brain className="w-8 h-8 text-purple-500 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sentiment Analysis</h1>
            <p className="text-gray-600 mt-1">
              Analyze emotions, polarity, and authenticity from video interviews
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/video-analysis')}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Video Analysis
          </Button>
          {stats.pending > 0 && (
            <Button 
              onClick={triggerBulkAnalysis}
              className="flex items-center gap-2"
              disabled={isAnalyzing !== null}
            >
              <Zap className="w-4 h-4" />
              Analyze All ({stats.pending})
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">×</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card 
          className={`p-4 cursor-pointer transition hover:shadow-md ${filters.status === 'all' && !filters.needs_review ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => { updateFilters('status', 'all'); updateFilters('needs_review', false); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Analyses</div>
            </div>
            <Brain className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </Card>
        
        <Card 
          className={`p-4 cursor-pointer transition hover:shadow-md ${filters.status === 'completed' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => updateFilters('status', 'completed')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </Card>
        
        <Card 
          className={`p-4 cursor-pointer transition hover:shadow-md ${filters.status === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => updateFilters('status', 'pending')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <Clock className="w-8 h-8 text-yellow-400 opacity-50" />
          </div>
        </Card>
        
        <Card 
          className={`p-4 cursor-pointer transition hover:shadow-md ${filters.needs_review ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => updateFilters('needs_review', !filters.needs_review)}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.needsReview}</div>
              <div className="text-sm text-gray-500">Needs Review</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400 opacity-50" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-2xl font-bold ${getPolarityColor(stats.avgSentiment)}`}>
                {stats.avgSentiment >= 0 ? '+' : ''}{(stats.avgSentiment * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-500">Avg Sentiment</div>
            </div>
            {stats.avgSentiment >= 0.1 ? (
              <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
            ) : stats.avgSentiment <= -0.1 ? (
              <TrendingDown className="w-8 h-8 text-red-400 opacity-50" />
            ) : (
              <Minus className="w-8 h-8 text-gray-400 opacity-50" />
            )}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => updateFilters('status', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Polarity</label>
            <select
              value={filters.polarity}
              onChange={(e) => updateFilters('polarity', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Polarity</option>
              <option value="strongly_positive">Strongly Positive</option>
              <option value="moderately_positive">Moderately Positive</option>
              <option value="slightly_positive">Slightly Positive</option>
              <option value="neutral">Neutral</option>
              <option value="slightly_negative">Slightly Negative</option>
              <option value="moderately_negative">Moderately Negative</option>
              <option value="strongly_negative">Strongly Negative</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emotion</label>
            <select
              value={filters.emotion}
              onChange={(e) => updateFilters('emotion', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Emotions</option>
              <option value="joy">Joy</option>
              <option value="trust">Trust</option>
              <option value="anticipation">Anticipation</option>
              <option value="surprise">Surprise</option>
              <option value="neutral">Neutral</option>
              <option value="sadness">Sadness</option>
              <option value="fear">Fear</option>
              <option value="anger">Anger</option>
              <option value="disgust">Disgust</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={filters.project_id}
              onChange={(e) => updateFilters('project_id', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              id="needsReview"
              checked={filters.needs_review}
              onChange={(e) => updateFilters('needs_review', e.target.checked)}
              className="rounded border-gray-300 text-purple-600 mr-2"
            />
            <label htmlFor="needsReview" className="text-sm text-gray-600">
              Needs Review Only
            </label>
          </div>
          
          <Button onClick={fetchAnalyses} variant="secondary" className="flex items-center gap-2 mt-auto">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Project Summary (when project selected) */}
      {projectSummary && (
        <Card className="p-4 mb-6 bg-purple-50 border-purple-200">
          <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Project Summary: {projectSummary.project_name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-purple-600">Total Analyses</p>
              <p className="text-xl font-bold text-purple-900">{projectSummary.total_analyses}</p>
            </div>
            <div>
              <p className="text-sm text-purple-600">Average Sentiment</p>
              <p className={`text-xl font-bold ${getPolarityColor(projectSummary.average_sentiment)}`}>
                {(projectSummary.average_sentiment * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-purple-600">Avg Authenticity</p>
              <p className="text-xl font-bold text-purple-900">
                {(projectSummary.average_authenticity * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-purple-600">Needs Review</p>
              <p className="text-xl font-bold text-red-600">{projectSummary.requires_review_count}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Analysis List */}
      {analyses.length === 0 ? (
        <Card className="p-12 text-center">
          <Brain className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sentiment Analyses Found</h3>
          <p className="text-gray-500 mb-4">
            Sentiment analyses will appear here once videos are analyzed.
          </p>
          <Button onClick={() => navigate('/video-analysis')}>
            Go to Video Analysis
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyses.map(analysis => (
            <Card 
              key={analysis.id}
              className={`overflow-hidden cursor-pointer hover:shadow-lg transition ${
                analysis.requires_review ? 'ring-2 ring-yellow-400' : ''
              }`}
              onClick={() => fetchAnalysisDetail(analysis.id)}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {analysis.beneficiary_name || `Video #${analysis.video}`}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={getStatusBadge(analysis.analysis_status)}>
                    {analysis.analysis_status}
                  </Badge>
                </div>
                
                {/* Polarity Score */}
                <div className="mb-3">
                  <PolarityIndicator 
                    score={analysis.polarity_score} 
                    label={analysis.polarity_label} 
                  />
                </div>
                
                {/* Emotion & Scores */}
                <div className="flex items-center justify-between mb-3">
                  <EmotionBadge emotion={analysis.primary_emotion} size="sm" />
                  {analysis.authenticity_score !== undefined && (
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                      analysis.authenticity_score >= 0.7 ? 'bg-green-100 text-green-700' :
                      analysis.authenticity_score >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      <Shield className="w-3 h-3 inline mr-1" />
                      {(analysis.authenticity_score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                
                {/* Composite Score Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Composite Score</span>
                    <span>{(analysis.composite_score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        analysis.composite_score >= 0.5 ? 'bg-green-500' :
                        analysis.composite_score >= 0 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.abs(analysis.composite_score) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* Review Flag */}
                {analysis.requires_review && (
                  <div className="flex items-center text-yellow-600 text-sm">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Needs Review
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAnalysis && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAnalysis(null)}
          title={`Sentiment Analysis: ${selectedAnalysis.beneficiary_name || `Video #${selectedAnalysis.video}`}`}
          size="xl"
        >
          {loadingDetail ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Quick Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => navigate(`/video-analysis?video=${selectedAnalysis.video}`)}
                  variant="secondary"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Video
                </Button>
                {selectedAnalysis.requires_review && (
                  <Button
                    onClick={() => {
                      setSelectedAnalysisId(selectedAnalysis.id);
                      setShowReviewModal(true);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Reviewed
                  </Button>
                )}
                <Button
                  variant="danger"
                  onClick={() => deleteAnalysis(selectedAnalysis.id)}
                  className="ml-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>

              {/* Overview */}
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <PolarityIndicator 
                    score={selectedAnalysis.polarity_score} 
                    label={selectedAnalysis.polarity_label} 
                  />
                  <EmotionBadge 
                    emotion={selectedAnalysis.primary_emotion} 
                    confidence={selectedAnalysis.primary_emotion_confidence}
                  />
                  <Badge variant={getStatusBadge(selectedAnalysis.analysis_status)}>
                    {selectedAnalysis.analysis_status}
                  </Badge>
                </div>
                
                {/* Executive Summary */}
                {selectedAnalysis.executive_summary && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Executive Summary
                    </h4>
                    <p className="text-gray-600">{selectedAnalysis.executive_summary}</p>
                  </div>
                )}
              </Card>

              {/* Scores Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sentiment Scores */}
                <AnalysisSection
                  title="Sentiment Scores"
                  icon={<BarChart3 className="w-4 h-4" />}
                  bgColor="bg-blue-50"
                >
                  <ScoreBar label="Composite" score={selectedAnalysis.composite_score} color="bg-blue-500" />
                  {selectedAnalysis.textual_score !== undefined && (
                    <ScoreBar label="Textual (60%)" score={selectedAnalysis.textual_score} color="bg-indigo-500" />
                  )}
                  {selectedAnalysis.visual_score !== undefined && (
                    <ScoreBar label="Visual (30%)" score={selectedAnalysis.visual_score} color="bg-purple-500" />
                  )}
                  {selectedAnalysis.vocal_score !== undefined && (
                    <ScoreBar label="Vocal (10%)" score={selectedAnalysis.vocal_score} color="bg-pink-500" />
                  )}
                </AnalysisSection>

                {/* Emotions */}
                <AnalysisSection
                  title="Emotion Analysis"
                  icon={<Heart className="w-4 h-4" />}
                  bgColor="bg-pink-50"
                >
                  <DataRow label="Primary Emotion" value={selectedAnalysis.primary_emotion} />
                  <DataRow label="Confidence" value={selectedAnalysis.primary_emotion_confidence} />
                  {selectedAnalysis.secondary_emotion && (
                    <>
                      <DataRow label="Secondary Emotion" value={selectedAnalysis.secondary_emotion} />
                      <DataRow label="Secondary Confidence" value={selectedAnalysis.secondary_emotion_confidence} />
                    </>
                  )}
                  {selectedAnalysis.emotion_distribution && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-2">Distribution:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(selectedAnalysis.emotion_distribution)
                          .sort(([,a], [,b]) => (b as number) - (a as number))
                          .slice(0, 5)
                          .map(([emotion, score]) => (
                            <EmotionBadge key={emotion} emotion={emotion} confidence={score as number} size="sm" />
                          ))
                        }
                      </div>
                    </div>
                  )}
                </AnalysisSection>

                {/* Authenticity */}
                <AnalysisSection
                  title="Authenticity"
                  icon={<Shield className="w-4 h-4" />}
                  bgColor="bg-green-50"
                >
                  <DataRow label="Authenticity Score" value={selectedAnalysis.authenticity_score} />
                  <DataRow label="Text-Visual Alignment" value={selectedAnalysis.text_visual_alignment} />
                  <DataRow label="Micro Expressions" value={selectedAnalysis.micro_expressions_detected} />
                  {selectedAnalysis.authenticity_notes && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      {selectedAnalysis.authenticity_notes}
                    </p>
                  )}
                </AnalysisSection>

                {/* Intent */}
                <AnalysisSection
                  title="Intent Detection"
                  icon={<Target className="w-4 h-4" />}
                  bgColor="bg-orange-50"
                >
                  <DataRow label="Primary Intent" value={selectedAnalysis.primary_intent} />
                  <DataRow label="Intent Confidence" value={selectedAnalysis.primary_intent_confidence} />
                  <DataRow label="Social Desirability" value={selectedAnalysis.social_desirability_score} />
                  {selectedAnalysis.secondary_intents && selectedAnalysis.secondary_intents.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Secondary Intents:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedAnalysis.secondary_intents.map((intent, i) => (
                          <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                            {intent.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </AnalysisSection>
              </div>

              {/* Quality Metrics */}
              <AnalysisSection
                title="Quality Metrics"
                icon={<CheckCircle className="w-4 h-4" />}
                bgColor="bg-slate-50"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Confidence</p>
                    <p className="font-medium">{((selectedAnalysis.analysis_confidence || 0) * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Coherence</p>
                    <p className="font-medium capitalize">{selectedAnalysis.response_coherence || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Engagement</p>
                    <p className="font-medium capitalize">{selectedAnalysis.engagement_level || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Word Count</p>
                    <p className="font-medium">{selectedAnalysis.word_count || 0}</p>
                  </div>
                </div>
              </AnalysisSection>

              {/* Red Flags */}
              {selectedAnalysis.red_flags && selectedAnalysis.red_flags.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Concerns ({selectedAnalysis.red_flags.length})
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {selectedAnalysis.red_flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notable Observations */}
              {selectedAnalysis.notable_observations && selectedAnalysis.notable_observations.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Notable Observations
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {selectedAnalysis.notable_observations.map((obs, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        {obs}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detailed Findings */}
              {selectedAnalysis.detailed_findings && (
                <AnalysisSection
                  title="Detailed Findings"
                  icon={<FileText className="w-4 h-4" />}
                  bgColor="bg-gray-50"
                  collapsible
                >
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedAnalysis.detailed_findings}
                  </p>
                </AnalysisSection>
              )}

              {/* Transcript */}
              {selectedAnalysis.transcript && (
                <AnalysisSection
                  title="Transcript"
                  icon={<MessageSquare className="w-4 h-4" />}
                  bgColor="bg-gray-50"
                  collapsible
                >
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedAnalysis.transcript}
                  </p>
                </AnalysisSection>
              )}

              {/* Review Section */}
              {selectedAnalysis.reviewed_at && (
                <div className="bg-green-50 rounded-lg p-4 text-sm">
                  <p className="text-green-800">
                    ✓ Reviewed on {new Date(selectedAnalysis.reviewed_at).toLocaleDateString()}
                  </p>
                  {selectedAnalysis.review_notes && (
                    <p className="text-green-700 mt-1 italic">"{selectedAnalysis.review_notes}"</p>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-gray-500 flex flex-wrap gap-4">
                <span>Created: {new Date(selectedAnalysis.created_at).toLocaleString()}</span>
                {selectedAnalysis.analyzed_at && (
                  <span>Analyzed: {new Date(selectedAnalysis.analyzed_at).toLocaleString()}</span>
                )}
                {selectedAnalysis.processing_time_seconds && (
                  <span>Processing: {selectedAnalysis.processing_time_seconds.toFixed(2)}s</span>
                )}
                {selectedAnalysis.model_used && (
                  <span>Model: {selectedAnalysis.model_used}</span>
                )}
                {selectedAnalysis.tokens_used !== undefined && selectedAnalysis.tokens_used > 0 && (
                  <span>Tokens: {selectedAnalysis.tokens_used}</span>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowReviewModal(false);
            setReviewNotes('');
            setSelectedAnalysisId(null);
          }}
          title="Review Sentiment Analysis"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review Notes (optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this review..."
                className="w-full border border-gray-300 rounded-lg p-3"
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={markAsReviewed} className="flex-1">
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Review
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewNotes('');
                  setSelectedAnalysisId(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SentimentAnalysisPage;