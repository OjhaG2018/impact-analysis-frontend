/**
 * VideoAnalysisPage.tsx
 * Admin page for viewing and managing AI interview video analyses.
 * ENHANCED: Integrated Sentiment Analysis
 * - Shows sentiment data alongside video analysis
 * - Triggers sentiment analysis when re-analyzing
 * - Sentiment details button for each video
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, RefreshCw, Zap, Trash2, Eye, Camera, Activity, Sun, Focus, 
  Volume2, Smile, Shield, Home, FileText, Clock, Monitor, Brain,
  Heart, TrendingUp, TrendingDown, Minus, MessageSquare, Target,
  AlertTriangle, CheckCircle, ThumbsUp, Frown, Meh
} from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner, Modal } from '../../components/ui';
import api, { videoAnalysisApi, sentimentAnalysisApi, SentimentAnalysis } from '../../api';

// API base URL for media files
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Types
interface VideoAnalysis {
  id: number;
  analysis_type: string;
  frames_analyzed: number;
  analysis_summary: string;
  demographic_observations: any;
  environment_observations: any;
  emotional_indicators: any;
  authenticity_indicators: any;
  living_conditions_assessment: any;
  identified_assets: string[];
  red_flags: string[];
  positive_indicators: string[];
  confidence_score: number;
  overall_confidence: string;
  requires_review: boolean;
  review_reasons: string[];
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string;
  tokens_used: number;
  processing_time_seconds: number;
  model_used: string;
  created_at: string;
}

interface InterviewVideo {
  id: number;
  session_id: number;
  beneficiary_name: string;
  project_title: string;
  video_type: string;
  video_file: string;
  video_url?: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  analysis_status: string;
  recorded_at: string;
  analyses: VideoAnalysis[];
}

// Helper component for displaying key-value pairs
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

// Section component for analysis data
const AnalysisSection: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  bgColor: string; 
  children: React.ReactNode;
}> = ({ title, icon, bgColor, children }) => (
  <div className={`${bgColor} rounded-lg p-4`}>
    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
      {icon}
      {title}
    </h4>
    <div>
      {children}
    </div>
  </div>
);

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
    if (score >= 0.1) return <TrendingUp className="w-4 h-4" />;
    if (score > -0.1) return <Minus className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm ${getColor()}`}>
      {getIcon()}
      <span className="font-semibold">{(score * 100).toFixed(0)}%</span>
      <span className="text-xs">{label.replace(/_/g, ' ')}</span>
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
    joy: { icon: <Smile className="w-3 h-3" />, color: 'bg-yellow-100 text-yellow-700' },
    sadness: { icon: <Frown className="w-3 h-3" />, color: 'bg-blue-100 text-blue-700' },
    anger: { icon: <AlertTriangle className="w-3 h-3" />, color: 'bg-red-100 text-red-700' },
    fear: { icon: <AlertTriangle className="w-3 h-3" />, color: 'bg-purple-100 text-purple-700' },
    surprise: { icon: <Eye className="w-3 h-3" />, color: 'bg-pink-100 text-pink-700' },
    trust: { icon: <ThumbsUp className="w-3 h-3" />, color: 'bg-green-100 text-green-700' },
    anticipation: { icon: <Clock className="w-3 h-3" />, color: 'bg-orange-100 text-orange-700' },
    neutral: { icon: <Meh className="w-3 h-3" />, color: 'bg-gray-100 text-gray-600' },
  };
  
  const config = emotionConfig[emotion?.toLowerCase()] || emotionConfig.neutral;
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${config.color} ${sizeClass}`}>
      {config.icon}
      <span className="capitalize">{emotion || 'neutral'}</span>
      {confidence !== undefined && (
        <span className="opacity-75">({(confidence * 100).toFixed(0)}%)</span>
      )}
    </span>
  );
};

// Score bar component
const ScoreBar: React.FC<{ label: string; score: number; color: string }> = ({ label, score, color }) => (
  <div className="mb-2">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{(score * 100).toFixed(0)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div 
        className={`h-1.5 rounded-full ${color}`}
        style={{ width: `${Math.abs(score) * 100}%` }}
      />
    </div>
  </div>
);

const VideoAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<InterviewVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<InterviewVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    status: 'all',
    needsReview: false
  });
  const [isAnalyzing, setIsAnalyzing] = useState<number | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  
  // Delete functionality states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<InterviewVideo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sentiment Analysis states
  const [sentimentData, setSentimentData] = useState<Record<number, SentimentAnalysis | null>>({});
  const [loadingSentiment, setLoadingSentiment] = useState<Record<number, boolean>>({});
  const [showSentimentModal, setShowSentimentModal] = useState(false);
  const [selectedSentiment, setSelectedSentiment] = useState<SentimentAnalysis | null>(null);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState<number | null>(null);

  useEffect(() => {
    fetchVideos();
  }, [filter]);

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/ai-interviews/videos/';
      const params = new URLSearchParams();
      
      if (filter.status !== 'all') {
        params.append('analysis_status', filter.status);
      }
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      const response = await api.get<any>(endpoint);
      let videoList = Array.isArray(response) ? response : (response.results || []);
      
      if (filter.needsReview) {
        videoList = videoList.filter((v: InterviewVideo) => 
          v.analyses?.some((a: VideoAnalysis) => a.requires_review)
        );
      }
      
      setVideos(videoList);
      
      // Fetch sentiment data for each video
      videoList.forEach((video: InterviewVideo) => {
        fetchSentimentForVideo(video.id);
      });
      
      if (selectedVideo) {
        const updated = videoList.find((v: InterviewVideo) => v.id === selectedVideo.id);
        if (updated) {
          setSelectedVideo(updated);
        }
      }
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      setError(err.message || 'Failed to load videos. Make sure video endpoints are enabled.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch sentiment analysis for a video
  const fetchSentimentForVideo = async (videoId: number) => {
    try {
      setLoadingSentiment(prev => ({ ...prev, [videoId]: true }));
      const response = await sentimentAnalysisApi.getAnalyses({ video_id: videoId });
      const data = Array.isArray(response) ? response : (response.results || []);
      if (data.length > 0) {
        // Get full details of the first (latest) analysis
        const fullAnalysis = await sentimentAnalysisApi.getAnalysis(data[0].id);
        setSentimentData(prev => ({ ...prev, [videoId]: fullAnalysis }));
      } else {
        setSentimentData(prev => ({ ...prev, [videoId]: null }));
      }
    } catch (err) {
      console.log(`No sentiment data for video ${videoId}`);
      setSentimentData(prev => ({ ...prev, [videoId]: null }));
    } finally {
      setLoadingSentiment(prev => ({ ...prev, [videoId]: false }));
    }
  };

  // Trigger sentiment analysis for a video
  const triggerSentimentAnalysis = async (videoId: number, questionContext?: string) => {
    setIsAnalyzingSentiment(videoId);
    setError(null);
    
    try {
      const response = await sentimentAnalysisApi.analyzeVideo({
        video_id: videoId,
        question_context: questionContext || 'How has the program affected you?',
        analysis_type: 'full'
      });
      
      if (response.success) {
        setSuccess(`✅ Sentiment analysis completed!`);
        await fetchSentimentForVideo(videoId);
      } else {
        setError(response.error || 'Sentiment analysis failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze sentiment');
    } finally {
      setIsAnalyzingSentiment(null);
    }
  };

  // View sentiment details
  const viewSentimentDetails = (videoId: number) => {
    const sentiment = sentimentData[videoId];
    if (sentiment) {
      setSelectedSentiment(sentiment);
      setShowSentimentModal(true);
    }
  };

  // Delete video function
  const deleteVideo = async () => {
    if (!videoToDelete) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await api.delete(`/ai-interviews/videos/${videoToDelete.id}/`);
      
      setSuccess(`✅ Video "${videoToDelete.beneficiary_name}" deleted successfully`);
      
      setShowDeleteModal(false);
      setVideoToDelete(null);
      
      if (selectedVideo?.id === videoToDelete.id) {
        setSelectedVideo(null);
      }
      
      await fetchVideos();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error 
        || err.response?.data?.detail
        || err.message 
        || 'Failed to delete video. Please try again.';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = (video: InterviewVideo, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setVideoToDelete(video);
    setShowDeleteModal(true);
  };

  // Updated triggerAnalysis to also run sentiment analysis
  const triggerAnalysis = async (videoId: number, includeSentiment: boolean = true) => {
    setIsAnalyzing(videoId);
    setError(null);
    setSuccess(null);
    
    try {
      // First run video analysis
      const response = await videoAnalysisApi.analyzeVideo(videoId);
      
      if (response.success) {
        const tokensMsg = response.tokens_used === 0 ? ' (FREE - Local Analysis)' : ` (${response.tokens_used} tokens)`;
        setSuccess(`✅ ${response.message || 'Video analysis completed'}${tokensMsg}`);
        await fetchVideos();
        
        // Then run sentiment analysis if requested
        if (includeSentiment) {
          setSuccess(prev => prev + ' Running sentiment analysis...');
          await triggerSentimentAnalysis(videoId);
        }
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error 
        || err.message 
        || 'Failed to trigger analysis. Please try again later.';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(null);
    }
  };

  const triggerBulkAnalysis = async () => {
    const pendingVideos = videos.filter(v => v.analysis_status === 'pending');
    if (pendingVideos.length === 0) {
      setError('No pending videos to analyze');
      return;
    }
    
    setError(null);
    setSuccess(`Starting analysis of ${pendingVideos.length} videos...`);
    
    let completed = 0;
    let failed = 0;
    
    for (const video of pendingVideos) {
      try {
        setIsAnalyzing(video.id);
        await videoAnalysisApi.analyzeVideo(video.id);
        await triggerSentimentAnalysis(video.id);
        completed++;
      } catch {
        failed++;
      }
    }
    
    setIsAnalyzing(null);
    await fetchVideos();
    setSuccess(`✅ Bulk analysis complete: ${completed} succeeded, ${failed} failed`);
  };

  const markAsReviewed = async () => {
    if (!selectedAnalysisId) return;
    
    try {
      await videoAnalysisApi.reviewAnalysis(selectedAnalysisId, {
        review_notes: reviewNotes,
        clear_review_flag: true
      });
      setShowReviewModal(false);
      setReviewNotes('');
      setSelectedAnalysisId(null);
      setSuccess('Analysis marked as reviewed');
      await fetchVideos();
    } catch (err: any) {
      setError(err.message || 'Failed to mark as reviewed');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
      pending: 'warning',
      processing: 'info',
      completed: 'success',
      failed: 'danger'
    };
    return variants[status] || 'warning';
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBg = (score: number) => {
    if (score >= 0.8) return 'bg-green-100';
    if (score >= 0.6) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoUrl = (video: InterviewVideo) => {
    if (video.video_url) return video.video_url;
    return `${API_BASE_URL}/api/ai-interviews/videos/${video.id}/serve/`;
  };

  // Stats
  const stats = {
    total: videos.length,
    analyzed: videos.filter(v => v.analysis_status === 'completed').length,
    pending: videos.filter(v => v.analysis_status === 'pending').length,
    needsReview: videos.filter(v => v.analyses?.some(a => a.requires_review)).length,
    totalTokens: videos.reduce((sum, v) => sum + (v.analyses?.reduce((s, a) => s + (a.tokens_used || 0), 0) || 0), 0)
  };

  if (loading) {
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Analysis Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Review AI analysis of beneficiary interview videos
            <span className="ml-2 text-green-600 text-sm font-medium">
              🆓 Using FREE Local Analysis (OpenCV)
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/sentiment-analysis')}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            Sentiment Dashboard
          </Button>
          <Button 
            onClick={() => navigate('/upload-videos')}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Videos
          </Button>
          {stats.pending > 0 && (
            <Button 
              onClick={triggerBulkAnalysis}
              variant="secondary"
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
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700 underline">
            Dismiss
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-2 text-green-500 hover:text-green-700 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card 
          className={`p-4 cursor-pointer transition hover:shadow-md ${filter.status === 'all' && !filter.needsReview ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setFilter({ status: 'all', needsReview: false })}
        >
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Videos</div>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition hover:shadow-md ${filter.status === 'completed' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setFilter({ status: 'completed', needsReview: false })}
        >
          <div className="text-2xl font-bold text-green-600">{stats.analyzed}</div>
          <div className="text-sm text-gray-500">Analyzed</div>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition hover:shadow-md ${filter.status === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setFilter({ status: 'pending', needsReview: false })}
        >
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition hover:shadow-md ${filter.needsReview ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setFilter({ status: 'all', needsReview: true })}
        >
          <div className="text-2xl font-bold text-red-600">{stats.needsReview}</div>
          <div className="text-sm text-gray-500">Needs Review</div>
        </Card>
        <Card className="p-4 bg-green-50">
          <div className="text-2xl font-bold text-green-600">{stats.totalTokens === 0 ? 'FREE' : stats.totalTokens}</div>
          <div className="text-sm text-green-700">API Tokens Used</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="needsReview"
              checked={filter.needsReview}
              onChange={(e) => setFilter({ ...filter, needsReview: e.target.checked })}
              className="rounded border-gray-300 text-emerald-600 mr-2"
            />
            <label htmlFor="needsReview" className="text-sm text-gray-600">
              Show only needs review
            </label>
          </div>
          <Button onClick={fetchVideos} variant="secondary" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">📹</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Videos Found</h3>
          <p className="text-gray-500 mb-4">
            Videos will appear here once beneficiaries complete interviews with video recording.
          </p>
          <Button 
            onClick={() => navigate('/upload-videos')}
            className="inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Pre-recorded Videos
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(video => {
            const sentiment = sentimentData[video.id];
            const isLoadingSentiment = loadingSentiment[video.id];
            
            return (
              <Card 
                key={video.id} 
                className={`overflow-hidden cursor-pointer hover:shadow-lg transition group ${isAnalyzing === video.id ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setSelectedVideo(video)}
              >
                {/* Thumbnail */}
                <div className="relative h-40 bg-gray-200">
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-4xl">🎥</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration_seconds || 0)}
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant={getStatusBadge(video.analysis_status)}>
                      {video.analysis_status}
                    </Badge>
                  </div>
                  {/* DELETE BUTTON ON THUMBNAIL */}
                  <button
                    onClick={(e) => confirmDelete(video, e)}
                    className="absolute top-2 left-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Delete video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {(isAnalyzing === video.id || isAnalyzingSentiment === video.id) && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <LoadingSpinner />
                        <p className="mt-2 text-sm">
                          {isAnalyzing === video.id ? 'Analyzing Video...' : 'Analyzing Sentiment...'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900">{video.beneficiary_name || 'Unknown'}</h3>
                  <p className="text-sm text-gray-500">{video.project_title || 'Unknown Project'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {video.recorded_at ? new Date(video.recorded_at).toLocaleDateString() : '-'}
                  </p>

                  {/* Video Analysis Summary */}
                  {video.analyses && video.analyses.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium px-2 py-1 rounded ${getConfidenceBg(video.analyses[0].confidence_score || 0)} ${getConfidenceColor(video.analyses[0].confidence_score || 0)}`}>
                          {((video.analyses[0].confidence_score || 0) * 100).toFixed(0)}% confidence
                        </span>
                        {video.analyses[0].requires_review && (
                          <Badge variant="danger">Needs Review</Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {video.analyses[0].analysis_summary}
                      </p>
                    </div>
                  )}

                  {/* Sentiment Analysis Summary - NEW */}
                  {sentiment && (
                    <div className="mt-3 pt-3 border-t border-purple-100 bg-purple-50 -mx-4 px-4 pb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">Sentiment Analysis</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <PolarityIndicator score={sentiment.polarity_score} label={sentiment.polarity_label} />
                        <EmotionBadge emotion={sentiment.primary_emotion} size="sm" />
                      </div>
                      {sentiment.authenticity_score !== undefined && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-purple-600">
                          <Shield className="w-3 h-3" />
                          Authenticity: {(sentiment.authenticity_score * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  )}

                  {isLoadingSentiment && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <LoadingSpinner size="sm" />
                      Loading sentiment...
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(video.analysis_status === 'pending' || video.analysis_status === 'failed') && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerAnalysis(video.id, true);
                        }}
                        disabled={isAnalyzing !== null || isAnalyzingSentiment !== null}
                      >
                        {isAnalyzing === video.id ? 'Analyzing...' : 'Analyze'}
                      </Button>
                    )}
                    {video.analysis_status === 'completed' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerAnalysis(video.id, true);
                        }}
                        disabled={isAnalyzing !== null || isAnalyzingSentiment !== null}
                      >
                        Re-analyze
                      </Button>
                    )}
                    
                    {/* Sentiment Analysis Button - NEW */}
                    {sentiment ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewSentimentDetails(video.id);
                        }}
                        className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                      >
                        <Brain className="w-3 h-3 mr-1" />
                        Sentiment
                      </Button>
                    ) : video.analysis_status === 'completed' && !isLoadingSentiment ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerSentimentAnalysis(video.id);
                        }}
                        disabled={isAnalyzingSentiment !== null}
                        className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                      >
                        <Brain className="w-3 h-3 mr-1" />
                        {isAnalyzingSentiment === video.id ? 'Analyzing...' : 'Analyze Sentiment'}
                      </Button>
                    ) : null}
                    
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVideo(video);
                      }}
                    >
                      Details
                    </Button>
                    
                    {/* DELETE BUTTON */}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={(e) => confirmDelete(video, e)}
                      className="ml-auto"
                      title="Delete video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Video Detail Modal - ENHANCED with Sentiment */}
      {selectedVideo && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVideo(null)}
          title={`Video: ${selectedVideo.beneficiary_name || 'Unknown'}`}
          size="xl"
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Video Player */}
            {getVideoUrl(selectedVideo) && (
              <div>
                <video 
                  controls 
                  className="w-full rounded-lg bg-black"
                  src={getVideoUrl(selectedVideo) || undefined}
                />
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => triggerAnalysis(selectedVideo.id, true)}
                disabled={isAnalyzing !== null || isAnalyzingSentiment !== null}
              >
                {isAnalyzing === selectedVideo.id ? 'Analyzing...' : (selectedVideo.analysis_status === 'completed' ? 'Re-analyze All' : 'Analyze Video')}
              </Button>
              
              {sentimentData[selectedVideo.id] ? (
                <Button 
                  variant="secondary" 
                  onClick={() => viewSentimentDetails(selectedVideo.id)}
                  className="bg-purple-50 text-purple-700 border-purple-200"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  View Sentiment Details
                </Button>
              ) : (
                <Button 
                  variant="secondary" 
                  onClick={() => triggerSentimentAnalysis(selectedVideo.id)}
                  disabled={isAnalyzingSentiment !== null}
                  className="bg-purple-50 text-purple-700 border-purple-200"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  {isAnalyzingSentiment === selectedVideo.id ? 'Analyzing...' : 'Run Sentiment Analysis'}
                </Button>
              )}
              
              <Button variant="secondary" onClick={fetchVideos}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
              <Button 
                variant="danger" 
                onClick={() => confirmDelete(selectedVideo)}
                className="ml-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Video
              </Button>
            </div>

            {/* Sentiment Summary Card - NEW */}
            {sentimentData[selectedVideo.id] && (
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Sentiment Analysis Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-purple-600">Polarity</p>
                    <PolarityIndicator 
                      score={sentimentData[selectedVideo.id]!.polarity_score} 
                      label={sentimentData[selectedVideo.id]!.polarity_label} 
                    />
                  </div>
                  <div>
                    <p className="text-xs text-purple-600">Primary Emotion</p>
                    <EmotionBadge 
                      emotion={sentimentData[selectedVideo.id]!.primary_emotion}
                      confidence={sentimentData[selectedVideo.id]!.primary_emotion_confidence}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-purple-600">Authenticity</p>
                    <p className="font-semibold text-purple-900">
                      {((sentimentData[selectedVideo.id]!.authenticity_score || 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-600">Composite Score</p>
                    <p className="font-semibold text-purple-900">
                      {((sentimentData[selectedVideo.id]!.composite_score || 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                {sentimentData[selectedVideo.id]!.executive_summary && (
                  <p className="mt-3 text-sm text-purple-800 bg-white bg-opacity-50 p-2 rounded">
                    {sentimentData[selectedVideo.id]!.executive_summary}
                  </p>
                )}
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => viewSentimentDetails(selectedVideo.id)}
                  className="mt-3"
                >
                  View Full Details
                </Button>
              </Card>
            )}

            {/* Video Analyses */}
            {selectedVideo.analyses && selectedVideo.analyses.length > 0 ? (
              selectedVideo.analyses.map((analysis, idx) => (
                <Card key={idx} className="p-4">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Video Analysis Results</h3>
                      <p className="text-xs text-gray-500">
                        {analysis.frames_analyzed} frames analyzed
                        {analysis.tokens_used === 0 ? (
                          <span className="ml-2 text-green-600">• FREE Local Analysis (OpenCV)</span>
                        ) : (
                          <span className="ml-2">• {analysis.tokens_used} tokens</span>
                        )}
                        {analysis.processing_time_seconds && (
                          <span className="ml-2">• {analysis.processing_time_seconds.toFixed(2)}s</span>
                        )}
                      </p>
                    </div>
                    <span className={`text-lg font-bold px-3 py-1 rounded ${getConfidenceBg(analysis.confidence_score || 0)} ${getConfidenceColor(analysis.confidence_score || 0)}`}>
                      {((analysis.confidence_score || 0) * 100).toFixed(0)}% confidence
                    </span>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-gray-700">{analysis.analysis_summary}</p>
                  </div>

                  {/* Analysis sections - keeping existing ones compact */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Authenticity */}
                    {analysis.authenticity_indicators && Object.keys(analysis.authenticity_indicators).length > 0 && (
                      <AnalysisSection 
                        title="Authenticity & Quality" 
                        icon={<Shield className="w-4 h-4" />}
                        bgColor="bg-indigo-50"
                      >
                        <DataRow label="Face Visible" value={analysis.authenticity_indicators.face_visible_ratio} />
                        <DataRow label="Eyes Visible" value={analysis.authenticity_indicators.eyes_visible_ratio} />
                        <DataRow label="Looking at Camera" value={analysis.authenticity_indicators.camera_look_ratio} />
                        <DataRow label="Motion Pattern" value={analysis.authenticity_indicators.motion_pattern} />
                      </AnalysisSection>
                    )}

                    {/* Environment */}
                    {analysis.environment_observations && Object.keys(analysis.environment_observations).length > 0 && (
                      <AnalysisSection 
                        title="Environment & Quality" 
                        icon={<Home className="w-4 h-4" />}
                        bgColor="bg-blue-50"
                      >
                        <DataRow label="Setting Type" value={analysis.environment_observations.setting_type} />
                        <DataRow label="Lighting Quality" value={analysis.environment_observations.lighting_quality} />
                        <DataRow label="Video Quality" value={analysis.environment_observations.video_quality} />
                        <DataRow label="Background" value={analysis.environment_observations.background_type} />
                      </AnalysisSection>
                    )}
                  </div>

                  {/* Red Flags & Positive Indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {analysis.red_flags && analysis.red_flags.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-4">
                        <h4 className="font-semibold text-red-800 mb-2">⚠️ Concerns</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          {analysis.red_flags.map((flag, i) => (
                            <li key={i}>• {flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.positive_indicators && analysis.positive_indicators.length > 0 && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-semibold text-green-800 mb-2">✓ Positive Indicators</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          {analysis.positive_indicators.map((indicator, i) => (
                            <li key={i}>• {indicator}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Review Action */}
                  {analysis.requires_review && !analysis.reviewed_at && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => {
                          setSelectedAnalysisId(analysis.id);
                          setShowReviewModal(true);
                        }}
                      >
                        Mark as Reviewed
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-gray-500 mb-4">No video analysis available yet</p>
                <Button
                  onClick={() => triggerAnalysis(selectedVideo.id, true)}
                  disabled={isAnalyzing !== null}
                >
                  {isAnalyzing === selectedVideo.id ? 'Analyzing...' : 'Run Full Analysis (FREE)'}
                </Button>
              </Card>
            )}
          </div>
        </Modal>
      )}

      {/* Sentiment Analysis Detail Modal - NEW */}
      {showSentimentModal && selectedSentiment && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowSentimentModal(false);
            setSelectedSentiment(null);
          }}
          title="Sentiment Analysis Details"
          size="xl"
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Overview */}
            <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <PolarityIndicator 
                  score={selectedSentiment.polarity_score} 
                  label={selectedSentiment.polarity_label} 
                />
                <EmotionBadge 
                  emotion={selectedSentiment.primary_emotion} 
                  confidence={selectedSentiment.primary_emotion_confidence}
                />
                <Badge variant={selectedSentiment.analysis_status === 'completed' ? 'success' : 'warning'}>
                  {selectedSentiment.analysis_status}
                </Badge>
              </div>
              
              {selectedSentiment.executive_summary && (
                <div className="bg-white bg-opacity-70 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Executive Summary
                  </h4>
                  <p className="text-gray-600">{selectedSentiment.executive_summary}</p>
                </div>
              )}
            </Card>

            {/* Score Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sentiment Scores */}
              <AnalysisSection
                title="Sentiment Scores"
                icon={<TrendingUp className="w-4 h-4" />}
                bgColor="bg-blue-50"
              >
                <ScoreBar label="Composite Score" score={selectedSentiment.composite_score} color="bg-blue-500" />
                {selectedSentiment.textual_score !== undefined && (
                  <ScoreBar label="Textual (60%)" score={selectedSentiment.textual_score} color="bg-indigo-500" />
                )}
                {selectedSentiment.visual_score !== undefined && (
                  <ScoreBar label="Visual (30%)" score={selectedSentiment.visual_score} color="bg-purple-500" />
                )}
                {selectedSentiment.vocal_score !== undefined && (
                  <ScoreBar label="Vocal (10%)" score={selectedSentiment.vocal_score} color="bg-pink-500" />
                )}
              </AnalysisSection>

              {/* Emotions */}
              <AnalysisSection
                title="Emotion Analysis"
                icon={<Heart className="w-4 h-4" />}
                bgColor="bg-pink-50"
              >
                <DataRow label="Primary Emotion" value={selectedSentiment.primary_emotion} />
                <DataRow label="Confidence" value={selectedSentiment.primary_emotion_confidence} />
                {selectedSentiment.secondary_emotion && (
                  <>
                    <DataRow label="Secondary Emotion" value={selectedSentiment.secondary_emotion} />
                    <DataRow label="Secondary Confidence" value={selectedSentiment.secondary_emotion_confidence} />
                  </>
                )}
                {selectedSentiment.emotion_distribution && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Distribution:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(selectedSentiment.emotion_distribution)
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
                <DataRow label="Authenticity Score" value={selectedSentiment.authenticity_score} />
                <DataRow label="Text-Visual Alignment" value={selectedSentiment.text_visual_alignment} />
                {selectedSentiment.authenticity_notes && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    {selectedSentiment.authenticity_notes}
                  </p>
                )}
              </AnalysisSection>

              {/* Intent */}
              <AnalysisSection
                title="Intent Detection"
                icon={<Target className="w-4 h-4" />}
                bgColor="bg-orange-50"
              >
                <DataRow label="Primary Intent" value={selectedSentiment.primary_intent} />
                <DataRow label="Intent Confidence" value={selectedSentiment.primary_intent_confidence} />
                <DataRow label="Social Desirability" value={selectedSentiment.social_desirability_score} />
                {selectedSentiment.secondary_intents && selectedSentiment.secondary_intents.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Secondary Intents:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSentiment.secondary_intents.map((intent, i) => (
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
                  <p className="font-medium">{((selectedSentiment.analysis_confidence || 0) * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Coherence</p>
                  <p className="font-medium capitalize">{selectedSentiment.response_coherence || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Engagement</p>
                  <p className="font-medium capitalize">{selectedSentiment.engagement_level || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Word Count</p>
                  <p className="font-medium">{selectedSentiment.word_count || 0}</p>
                </div>
              </div>
            </AnalysisSection>

            {/* Red Flags */}
            {selectedSentiment.red_flags && selectedSentiment.red_flags.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Concerns ({selectedSentiment.red_flags.length})
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {selectedSentiment.red_flags.map((flag, i) => (
                    <li key={i}>• {flag}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notable Observations */}
            {selectedSentiment.notable_observations && selectedSentiment.notable_observations.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Notable Observations
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {selectedSentiment.notable_observations.map((obs, i) => (
                    <li key={i}>• {obs}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Findings */}
            {selectedSentiment.detailed_findings && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Detailed Findings
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedSentiment.detailed_findings}
                </p>
              </div>
            )}

            {/* Transcript */}
            {selectedSentiment.transcript && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Transcript
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedSentiment.transcript}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-gray-500 flex flex-wrap gap-4 pt-4 border-t">
              <span>Created: {new Date(selectedSentiment.created_at).toLocaleString()}</span>
              {selectedSentiment.analyzed_at && (
                <span>Analyzed: {new Date(selectedSentiment.analyzed_at).toLocaleString()}</span>
              )}
              {selectedSentiment.processing_time_seconds && (
                <span>Processing: {selectedSentiment.processing_time_seconds.toFixed(2)}s</span>
              )}
              {selectedSentiment.model_used && (
                <span>Model: {selectedSentiment.model_used}</span>
              )}
            </div>
          </div>
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
          title="Review Analysis"
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

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && videoToDelete && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowDeleteModal(false);
            setVideoToDelete(null);
          }}
          title="Delete Video"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-gray-700">
                  Are you sure you want to delete this video?
                </p>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{videoToDelete.beneficiary_name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{videoToDelete.project_title || 'Unknown Project'}</p>
                </div>
                <p className="mt-3 text-sm text-red-600">
                  ⚠️ This action cannot be undone. The video file and all associated analyses will be permanently deleted.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="danger"
                onClick={deleteVideo}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Video
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setVideoToDelete(null);
                }}
                disabled={isDeleting}
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

export default VideoAnalysisPage;