/**
 * VideoAnalysisPage.tsx
 * Admin page for viewing and managing AI interview video analyses.
 * Place this file in: frontend/src/pages/VideoAnalysisPage.tsx
 */
import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, LoadingSpinner, Modal } from '../../components/ui';
import api from '../../api';

// API base URL for media files
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Types
interface VideoAnalysis {
  id: number;
  analysis_type: string;
  frames_analyzed: number;
  analysis_summary: string;
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

const VideoAnalysisPage: React.FC = () => {
  const [videos, setVideos] = useState<InterviewVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<InterviewVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    status: 'all',
    needsReview: false
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);

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
      
      // Filter by review status if needed
      if (filter.needsReview) {
        videoList = videoList.filter((v: InterviewVideo) => 
          v.analyses?.some((a: VideoAnalysis) => a.requires_review)
        );
      }
      
      setVideos(videoList);
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      setError(err.message || 'Failed to load videos. Make sure video endpoints are enabled.');
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async (videoId: number) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await api.post<{ success: boolean; message?: string; error?: string }>(
        `/ai-interviews/videos/${videoId}/analyze/`, 
        {
          analysis_type: 'comprehensive',
          num_frames: 5
        }
      );
      
      if (response.success) {
        setSuccess(response.message || 'Video analysis completed successfully');
      } else {
        setError(response.error || 'Analysis failed');
      }
      await fetchVideos();
    } catch (err: any) {
      // Extract user-friendly error message from response
      const errorMessage = err.response?.data?.error 
        || err.message 
        || 'Failed to trigger analysis. Please try again later.';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const markAsReviewed = async () => {
    if (!selectedAnalysisId) return;
    
    try {
      await api.post(`/ai-interviews/video-analyses/${selectedAnalysisId}/review/`, {
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get full video URL
  const getVideoUrl = (video: InterviewVideo) => {
    if (video.video_url) return video.video_url;
    // Use the video serving endpoint
    return `${API_BASE_URL}/api/ai-interviews/videos/${video.id}/serve/`;
  };

  // Stats
  const stats = {
    total: videos.length,
    analyzed: videos.filter(v => v.analysis_status === 'completed').length,
    pending: videos.filter(v => v.analysis_status === 'pending').length,
    needsReview: videos.filter(v => v.analyses?.some(a => a.requires_review)).length
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Video Analysis Dashboard</h1>
        <p className="text-gray-600 mt-1">Review AI analysis of beneficiary interview videos</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Videos</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{stats.analyzed}</div>
          <div className="text-sm text-gray-500">Analyzed</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">{stats.needsReview}</div>
          <div className="text-sm text-gray-500">Needs Review</div>
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
          <Button onClick={fetchVideos} variant="secondary">
            Refresh
          </Button>
        </div>
      </Card>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">📹</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Videos Found</h3>
          <p className="text-gray-500">
            Videos will appear here once beneficiaries complete interviews with video recording.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(video => (
            <Card 
              key={video.id} 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition"
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
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-medium text-gray-900">{video.beneficiary_name || 'Unknown'}</h3>
                <p className="text-sm text-gray-500">{video.project_title || 'Unknown Project'}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {video.recorded_at ? new Date(video.recorded_at).toLocaleDateString() : '-'}
                </p>

                {/* Analysis Summary */}
                {video.analyses && video.analyses.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${getConfidenceColor(video.analyses[0].confidence_score || 0)}`}>
                        {((video.analyses[0].confidence_score || 0) * 100).toFixed(0)}% confidence
                      </span>
                      {video.analyses[0].requires_review && (
                        <Badge variant="danger">Needs Review</Badge>
                      )}
                    </div>
                    {video.analyses[0].red_flags && video.analyses[0].red_flags.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-red-600">
                          ⚠️ {video.analyses[0].red_flags.length} concern(s)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  {video.analysis_status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerAnalysis(video.id);
                      }}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                  )}
                  {getVideoUrl(video) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVideo(video);
                      }}
                    >
                      Play
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Video Detail Modal */}
      {selectedVideo && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVideo(null)}
          title={`Video: ${selectedVideo.beneficiary_name || 'Unknown'}`}
          size="xl"
        >
          <div className="space-y-6">
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

            {/* Analyses */}
            {selectedVideo.analyses && selectedVideo.analyses.length > 0 ? (
              selectedVideo.analyses.map((analysis, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-900">Analysis Results</h3>
                    <span className={`text-lg font-bold ${getConfidenceColor(analysis.confidence_score || 0)}`}>
                      {((analysis.confidence_score || 0) * 100).toFixed(0)}% confidence
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-gray-700 mb-4">{analysis.analysis_summary}</p>

                  {/* Grid of observations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.environment_observations && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-gray-700 mb-2">Environment</h4>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-500">Setting:</span> {analysis.environment_observations.setting_type || '-'}</p>
                          <p><span className="text-gray-500">Location:</span> {analysis.environment_observations.location_type || '-'}</p>
                          <p><span className="text-gray-500">Condition:</span> {analysis.environment_observations.condition || '-'}</p>
                        </div>
                      </div>
                    )}

                    {analysis.emotional_indicators && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-gray-700 mb-2">Emotional Indicators</h4>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-500">Demeanor:</span> {analysis.emotional_indicators.overall_demeanor || '-'}</p>
                          <p><span className="text-gray-500">Engagement:</span> {analysis.emotional_indicators.engagement_level || '-'}</p>
                          <p><span className="text-gray-500">Genuineness:</span> {analysis.emotional_indicators.genuineness || '-'}</p>
                        </div>
                      </div>
                    )}

                    {analysis.authenticity_indicators && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-gray-700 mb-2">Authenticity</h4>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-500">Eye Contact:</span> {analysis.authenticity_indicators.eye_contact || '-'}</p>
                          <p><span className="text-gray-500">Body Language:</span> {analysis.authenticity_indicators.body_language || '-'}</p>
                          <p><span className="text-gray-500">Pattern:</span> {analysis.authenticity_indicators.response_pattern || '-'}</p>
                        </div>
                      </div>
                    )}

                    {analysis.living_conditions_assessment && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-gray-700 mb-2">Living Conditions</h4>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-500">Housing:</span> {analysis.living_conditions_assessment.housing_quality || '-'}</p>
                          <p><span className="text-gray-500">Matches Profile:</span> {analysis.living_conditions_assessment.matches_stated_status ? 'Yes' : 'Uncertain'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Red Flags */}
                  {analysis.red_flags && analysis.red_flags.length > 0 && (
                    <div className="mt-4 bg-red-50 rounded-lg p-3">
                      <h4 className="font-medium text-red-700 mb-2">⚠️ Concerns</h4>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {analysis.red_flags.map((flag, i) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Positive Indicators */}
                  {analysis.positive_indicators && analysis.positive_indicators.length > 0 && (
                    <div className="mt-4 bg-green-50 rounded-lg p-3">
                      <h4 className="font-medium text-green-700 mb-2">✓ Positive Indicators</h4>
                      <ul className="text-sm text-green-600 list-disc list-inside">
                        {analysis.positive_indicators.map((indicator, i) => (
                          <li key={i}>{indicator}</li>
                        ))}
                      </ul>
                    </div>
                  )}

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

                  {analysis.reviewed_at && (
                    <div className="mt-4 text-sm text-gray-500">
                      ✓ Reviewed on {new Date(analysis.reviewed_at).toLocaleDateString()}
                      {analysis.review_notes && (
                        <p className="mt-1 italic">"{analysis.review_notes}"</p>
                      )}
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-gray-500 mb-4">No analysis available yet</p>
                <Button
                  onClick={() => triggerAnalysis(selectedVideo.id)}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
                </Button>
              </Card>
            )}
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
    </div>
  );
};

export default VideoAnalysisPage;