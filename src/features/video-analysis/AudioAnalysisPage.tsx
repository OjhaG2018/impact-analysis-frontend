/**
 * AudioAnalysisPage.tsx
 * Page for uploading and analyzing audio files
 * Place in: frontend/src/features/video-analysis/AudioAnalysisPage.tsx
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, RefreshCw, Trash2, Eye, Mic, Play, Pause, Clock,
  CheckCircle, XCircle, AlertTriangle, Zap, FileAudio, Volume2,
  Heart, TrendingUp, TrendingDown, Minus, MessageSquare, Brain,
  Target, Shield, Languages, FileText, ThumbsUp, Meh, Frown, Smile
} from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner, Modal, Select } from '../../components/ui';
import api, { audioAnalysisApi, AudioFile, AudioAnalysis } from '../../api';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Status badge variants
const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
};

// Helper components
const DataRow: React.FC<{ label: string; value: any; icon?: React.ReactNode }> = ({ label, value, icon }) => {
  if (value === undefined || value === null || value === '') return null;
  
  let displayValue: string;
  if (typeof value === 'boolean') {
    displayValue = value ? '✓ Yes' : '✗ No';
  } else if (typeof value === 'number') {
    if (isNaN(value)) {
      displayValue = 'N/A';
    } else if (value < 1 && value > 0) {
      displayValue = `${(value * 100).toFixed(0)}%`;
    } else {
      displayValue = value.toFixed?.(2) || String(value);
    }
  } else {
    displayValue = String(value).replace(/_/g, ' ');
  }

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
}> = ({ title, icon, bgColor, children }) => (
  <div className={`${bgColor} rounded-lg p-4`}>
    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
      {icon}
      {title}
    </h4>
    <div>{children}</div>
  </div>
);

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
      {confidence != null && !isNaN(confidence) && (
        <span className="opacity-75">({(confidence * 100).toFixed(0)}%)</span>
      )}
    </span>
  );
};

const ScoreBar: React.FC<{ label: string; score: number | null | undefined; color: string }> = ({ label, score, color }) => {
  const safeScore = score ?? 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">
          {score != null ? `${(safeScore * 100).toFixed(0)}%` : 'N/A'}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${Math.abs(safeScore) * 100}%` }}
        />
      </div>
    </div>
  );
};

// Main Component
const AudioAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AudioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<number | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  
  // Filter state
  const [filter, setFilter] = useState({
    status: 'all',
    needsReview: false
  });
  
  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [audioToDelete, setAudioToDelete] = useState<AudioFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Audio playback
  const [isPlaying, setIsPlaying] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load audio files
  useEffect(() => {
    fetchAudioFiles();
  }, [filter]);

  const fetchAudioFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {};
      if (filter.status !== 'all') {
        params.status = filter.status;
      }
      
      const response = await audioAnalysisApi.getAudioList(params);
      let audioList = response.results || [];
      
      if (filter.needsReview) {
        audioList = audioList.filter(a =>
          a.analyses?.some(analysis => analysis.requires_review)
        );
      }
      
      setAudioFiles(audioList);
    } catch (err: any) {
      console.error('Error fetching audio files:', err);
      setError(err.message || 'Failed to load audio files');
    } finally {
      setLoading(false);
    }
  };

  // File selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const audioFiles = Array.from(files).filter(file =>
        file.type.startsWith('audio/') ||
        ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac', '.aac'].some(ext =>
          file.name.toLowerCase().endsWith(ext)
        )
      );
      setSelectedFiles(prev => [...prev, ...audioFiles]);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files) {
      const audioFiles = Array.from(files).filter(file =>
        file.type.startsWith('audio/') ||
        ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac', '.aac'].some(ext =>
          file.name.toLowerCase().endsWith(ext)
        )
      );
      setSelectedFiles(prev => [...prev, ...audioFiles]);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Upload
  const uploadAudioFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one audio file');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    
    let uploaded = 0;
    let failed = 0;
    
    for (const file of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('title', file.name);
        formData.append('auto_analyze', autoAnalyze ? 'true' : 'false');
        
        await audioAnalysisApi.uploadAudio(formData);
        uploaded++;
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        failed++;
      }
    }
    
    setIsUploading(false);
    setSelectedFiles([]);
    setShowUploadModal(false);
    
    if (uploaded > 0) {
      setSuccess(`✅ Uploaded ${uploaded} audio file(s)${failed > 0 ? `, ${failed} failed` : ''}`);
    } else {
      setError('All uploads failed');
    }
    
    fetchAudioFiles();
  };

  // Analyze
  const triggerAnalysis = async (audioId: number) => {
    setIsAnalyzing(audioId);
    setError(null);
    
    try {
      const response = await audioAnalysisApi.analyzeAudio(audioId);
      
      if (response.success) {
        setSuccess(`✅ Analysis completed: ${response.word_count} words, ${response.polarity} sentiment`);
        fetchAudioFiles();
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(null);
    }
  };

  const triggerBulkAnalysis = async () => {
    const pendingAudio = audioFiles.filter(a => a.analysis_status === 'pending');
    if (pendingAudio.length === 0) {
      setError('No pending audio files to analyze');
      return;
    }
    
    setError(null);
    setSuccess(`Analyzing ${pendingAudio.length} audio files...`);
    
    try {
      const response = await audioAnalysisApi.bulkAnalyzeAudio();
      setSuccess(`✅ Bulk analysis complete: ${response.successful} succeeded, ${response.failed} failed`);
      fetchAudioFiles();
    } catch (err: any) {
      setError(err.message || 'Bulk analysis failed');
    }
  };

  // Delete
  const confirmDelete = (audio: AudioFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAudioToDelete(audio);
    setShowDeleteModal(true);
  };

  const deleteAudio = async () => {
    if (!audioToDelete) return;
    
    setIsDeleting(true);
    
    try {
      await audioAnalysisApi.deleteAudioFile(audioToDelete.id);
      setSuccess(`✅ Audio file deleted`);
      setShowDeleteModal(false);
      setAudioToDelete(null);
      
      if (selectedAudio?.id === audioToDelete.id) {
        setSelectedAudio(null);
      }
      
      fetchAudioFiles();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  // Audio playback
  const togglePlayback = (audio: AudioFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const audioUrl = audio.audio_url || `${API_BASE_URL}/api/ai-interviews/audio-files/${audio.id}/serve/`;
    
    if (isPlaying === audio.id) {
      audioRef.current?.pause();
      setIsPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      audioRef.current.onended = () => setIsPlaying(null);
      setIsPlaying(audio.id);
    }
  };

  // View analysis details
  const viewAnalysisDetails = (audio: AudioFile) => {
    if (audio.analyses && audio.analyses.length > 0) {
      setSelectedAnalysis(audio.analyses[0] as any);
      setShowAnalysisModal(true);
    }
  };

  // Stats
  const stats = {
    total: audioFiles.length,
    analyzed: audioFiles.filter(a => a.analysis_status === 'completed').length,
    pending: audioFiles.filter(a => a.analysis_status === 'pending').length,
    needsReview: audioFiles.filter(a => a.analyses?.some(an => an.requires_review)).length,
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
        <div className="flex items-center">
          <Mic className="w-8 h-8 text-purple-500 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audio Analysis</h1>
            <p className="text-gray-600 mt-1">
              Upload and analyze audio recordings
              <span className="ml-2 text-green-600 text-sm font-medium">
                🆓 FREE Local Analysis (Whisper)
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/video-analysis')} variant="secondary">
            <Eye className="w-4 h-4 mr-2" />
            Video Analysis
          </Button>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Audio
          </Button>
          {stats.pending > 0 && (
            <Button onClick={triggerBulkAnalysis} variant="secondary">
              <Zap className="w-4 h-4 mr-2" />
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card
          className={`p-4 cursor-pointer transition hover:shadow-md ${filter.status === 'all' && !filter.needsReview ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => setFilter({ status: 'all', needsReview: false })}
        >
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Audio Files</div>
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
      </div>

      {/* Quick Upload Drop Zone */}
      <Card className="p-0 overflow-hidden mb-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => setShowUploadModal(true)}
          className="border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 m-4"
        >
          <FileAudio className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-lg font-medium text-gray-700 mb-1">
            Drop audio files here or click to upload
          </p>
          <p className="text-sm text-gray-500">
            Supports MP3, WAV, M4A, OGG, FLAC, AAC
          </p>
        </div>
      </Card>

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
              className="rounded border-gray-300 text-purple-600 mr-2"
            />
            <label htmlFor="needsReview" className="text-sm text-gray-600">
              Show only needs review
            </label>
          </div>
          <Button onClick={fetchAudioFiles} variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Audio Files Grid */}
      {audioFiles.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🎙️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Audio Files Found</h3>
          <p className="text-gray-500 mb-4">
            Upload audio recordings for transcription and sentiment analysis.
          </p>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Audio Files
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audioFiles.map(audio => {
            const analysis = audio.analyses && audio.analyses.length > 0 ? audio.analyses[0] : null;
            
            return (
              <Card
                key={audio.id}
                className={`overflow-hidden cursor-pointer hover:shadow-lg transition group ${isAnalyzing === audio.id ? 'ring-2 ring-purple-500' : ''}`}
                onClick={() => setSelectedAudio(audio)}
              >
                {/* Audio Info Header */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg mr-3">
                        <FileAudio className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 line-clamp-1">
                          {audio.title || `Audio ${audio.id}`}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {formatDuration(audio.duration_seconds)} • {formatFileSize(audio.file_size_bytes)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANTS[audio.analysis_status] || 'default'}>
                      {audio.analysis_status}
                    </Badge>
                  </div>
                  
                  {/* Playback and Delete */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={(e) => togglePlayback(audio, e)}
                      className={`p-2 rounded-full transition ${
                        isPlaying === audio.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-purple-600 hover:bg-purple-100'
                      }`}
                    >
                      {isPlaying === audio.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => confirmDelete(audio, e)}
                      className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Analysis Summary */}
                <div className="p-4">
                  <p className="text-sm text-gray-500 mb-2">
                    {audio.beneficiary_name || 'Standalone'} • {audio.project_title || 'No Project'}
                  </p>
                  
                  {analysis ? (
                    <div className="space-y-2">
                      {/* Language and Word Count */}
                      <div className="flex items-center gap-2 text-sm">
                        <Languages className="w-4 h-4 text-gray-400" />
                        <span>{analysis.transcript_language_name || 'Unknown'}</span>
                        <span className="text-gray-400">•</span>
                        <span>{analysis.transcript_word_count} words</span>
                      </div>
                      
                      {/* Sentiment */}
                      <div className="flex flex-wrap gap-2">
                        <PolarityIndicator
                          score={analysis.polarity_score}
                          label={analysis.polarity_label}
                        />
                        <EmotionBadge
                          emotion={analysis.primary_emotion}
                          size="sm"
                        />
                      </div>
                      
                      {/* Transcript Preview */}
                      {analysis.transcript && (
                        <p className="text-xs text-gray-600 line-clamp-2 mt-2 bg-gray-50 p-2 rounded">
                          "{analysis.transcript.substring(0, 100)}..."
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      {audio.analysis_status === 'processing' ? 'Analyzing...' : 'Not analyzed yet'}
                    </p>
                  )}
                  
                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(audio.analysis_status === 'pending' || audio.analysis_status === 'failed') && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerAnalysis(audio.id);
                        }}
                        disabled={isAnalyzing !== null}
                      >
                        {isAnalyzing === audio.id ? 'Analyzing...' : 'Analyze'}
                      </Button>
                    )}
                    
                    {analysis && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewAnalysisDetails(audio);
                        }}
                        className="bg-purple-50 text-purple-700"
                      >
                        <Brain className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                    )}
                    
                    {audio.analysis_status === 'completed' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerAnalysis(audio.id);
                        }}
                        disabled={isAnalyzing !== null}
                      >
                        Re-analyze
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedFiles([]);
        }}
        title="Upload Audio Files"
      >
        <div className="space-y-4">
          {/* Auto Analyze Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoAnalyze"
              checked={autoAnalyze}
              onChange={(e) => setAutoAnalyze(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 mr-2 h-4 w-4"
            />
            <label htmlFor="autoAnalyze" className="text-sm font-medium text-gray-700">
              Auto-analyze after upload (FREE)
            </label>
          </div>
          
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 rounded-lg p-6 text-center cursor-pointer transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac,.aac"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Mic className="w-10 h-10 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Drop audio files here or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">
              MP3, WAV, M4A, OGG, FLAC, AAC
            </p>
          </div>
          
          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0"
                >
                  <div className="flex items-center">
                    <FileAudio className="w-4 h-4 text-purple-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowUploadModal(false);
                setSelectedFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={uploadAudioFiles}
              disabled={isUploading || selectedFiles.length === 0}
            >
              {isUploading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Analysis Detail Modal */}
      {showAnalysisModal && selectedAnalysis && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowAnalysisModal(false);
            setSelectedAnalysis(null);
          }}
          title="Audio Analysis Details"
          size="xl"
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Overview */}
            <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <PolarityIndicator
                  score={selectedAnalysis.polarity_score}
                  label={selectedAnalysis.polarity_label}
                />
                <EmotionBadge
                  emotion={selectedAnalysis.primary_emotion}
                  confidence={selectedAnalysis.primary_emotion_confidence}
                />
                <div className="flex items-center gap-2 text-sm">
                  <Languages className="w-4 h-4 text-purple-600" />
                  <span>{selectedAnalysis.transcript_language_name}</span>
                  <span className="text-gray-400">•</span>
                  <span>{selectedAnalysis.transcript_word_count} words</span>
                </div>
              </div>
              
              {selectedAnalysis.executive_summary && (
                <div className="bg-white bg-opacity-70 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Executive Summary
                  </h4>
                  <p className="text-gray-600">{selectedAnalysis.executive_summary}</p>
                </div>
              )}
            </Card>

            {/* Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnalysisSection
                title="Sentiment Analysis"
                icon={<TrendingUp className="w-4 h-4" />}
                bgColor="bg-blue-50"
              >
                <ScoreBar label="Polarity" score={Math.abs(selectedAnalysis.polarity_score)} color="bg-blue-500" />
                
                <ScoreBar label="Confidence" score={selectedAnalysis.polarity_confidence} color="bg-indigo-500" />

                <DataRow label="Label" value={selectedAnalysis.polarity_label} />
              </AnalysisSection>

              <AnalysisSection
                title="Emotion Analysis"
                icon={<Heart className="w-4 h-4" />}
                bgColor="bg-pink-50"
              >
                <DataRow label="Primary Emotion" value={selectedAnalysis.primary_emotion} />
                <DataRow label="Confidence" value={selectedAnalysis.primary_emotion_confidence} />
                {selectedAnalysis.secondary_emotion && (
                  <DataRow label="Secondary Emotion" value={selectedAnalysis.secondary_emotion} />
                )}
              </AnalysisSection>

              <AnalysisSection
                title="Intent Detection"
                icon={<Target className="w-4 h-4" />}
                bgColor="bg-orange-50"
              >
                <DataRow label="Primary Intent" value={selectedAnalysis.primary_intent} />
                <DataRow label="Confidence" value={selectedAnalysis.primary_intent_confidence} />
              </AnalysisSection>

              <AnalysisSection
                title="Quality Metrics"
                icon={<Shield className="w-4 h-4" />}
                bgColor="bg-green-50"
              >
                <DataRow label="Confidence" value={selectedAnalysis.analysis_confidence} />
                <DataRow label="Coherence" value={selectedAnalysis.response_coherence} />
                <DataRow label="Engagement" value={selectedAnalysis.engagement_level} />
              </AnalysisSection>
            </div>

            {/* Transcript */}
            {selectedAnalysis.transcript && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Full Transcript
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedAnalysis.transcript}
                </p>
              </div>
            )}

            {/* Key Phrases */}
            {selectedAnalysis.key_phrases && selectedAnalysis.key_phrases.length > 0 && (
              <div className="bg-indigo-50 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-800 mb-2">Key Phrases</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAnalysis.key_phrases.map((phrase, i) => (
                    <span key={i} className="px-2 py-1 bg-white text-indigo-700 text-sm rounded">
                      "{phrase}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Red Flags */}
            {selectedAnalysis.red_flags && selectedAnalysis.red_flags.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Concerns
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {selectedAnalysis.red_flags.map((flag, i) => (
                    <li key={i}>• {flag}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Positive Indicators */}
            {selectedAnalysis.positive_indicators && selectedAnalysis.positive_indicators.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Positive Indicators
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  {selectedAnalysis.positive_indicators.map((indicator, i) => (
                    <li key={i}>• {indicator}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-gray-500 flex flex-wrap gap-4 pt-4 border-t">
              <span>Created: {new Date(selectedAnalysis.created_at).toLocaleString()}</span>
              {selectedAnalysis.processing_time_seconds && (
                <span>Processing: {selectedAnalysis.processing_time_seconds.toFixed(2)}s</span>
              )}
              <span>Model: {selectedAnalysis.model_used || 'local_whisper'}</span>
              <span className="text-green-600 font-medium">Cost: FREE</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && audioToDelete && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowDeleteModal(false);
            setAudioToDelete(null);
          }}
          title="Delete Audio File"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete "<strong>{audioToDelete.title}</strong>"?
            </p>
            <p className="text-sm text-red-600">
              This will also delete all associated analyses. This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-4">
              <Button variant="danger" onClick={deleteAudio} disabled={isDeleting} className="flex-1">
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setAudioToDelete(null);
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

export default AudioAnalysisPage;