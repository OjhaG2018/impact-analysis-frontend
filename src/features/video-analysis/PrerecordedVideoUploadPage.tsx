/**
 * PrerecordedVideoUploadPage.tsx
 * Page for uploading and analyzing pre-recorded videos
 * Styled to match AIInterviewsManagementPage
 * Place in: frontend/src/features/video-analysis/PrerecordedVideoUploadPage.tsx
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, Video, Play, Loader2, CheckCircle, XCircle, AlertTriangle, 
  Trash2, Eye, Film, Clock, CheckCircle2, RefreshCw
} from 'lucide-react';
import api, { endpoints, videoAnalysisApi } from '../../api';
import { Card, Button, Select, LoadingSpinner, Badge, Modal } from '../../components/ui';
import { Project, Beneficiary } from '../../types';

interface UploadedVideo {
  id: number;
  file_name: string;
  file_size: number;
  video_id: number;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis_summary?: string;
  confidence_score?: number;
  error?: string;
}

// Status badge variants (same pattern as AIInterviewsManagementPage)
const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
};

const PrerecordedVideoUploadPage: React.FC = () => {
  const navigate = useNavigate();
  
  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Project and Beneficiary state (same pattern as AIInterviewsManagementPage)
  const [projects, setProjects] = useState<Project[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  
  // Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load projects on mount (same as AIInterviewsManagementPage)
  useEffect(() => {
    loadProjects();
  }, []);
  
  // Load beneficiaries when project changes (same pattern as AIInterviewsManagementPage)
  useEffect(() => {
    if (selectedProject) {
      loadBeneficiaries(selectedProject);
    } else {
      setBeneficiaries([]);
      setSelectedBeneficiary('');
    }
  }, [selectedProject]);
  
  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ results: Project[] } | Project[]>(endpoints.projects);
      const data = Array.isArray(response) ? response : (response.results || []);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadBeneficiaries = async (projectId: string) => {
    if (!projectId) {
      setBeneficiaries([]);
      return;
    }
    try {
      const response = await api.get<{ results: Beneficiary[] } | Beneficiary[]>(
        `${endpoints.beneficiaries}?project=${projectId}`
      );
      const data = Array.isArray(response) ? response : (response.results || []);
      setBeneficiaries(data);
    } catch (err) {
      console.error('Failed to load beneficiaries:', err);
    }
  };
  
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value;
    setSelectedProject(projectId);
    setSelectedBeneficiary(''); // Reset beneficiary when project changes
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const videoFiles = Array.from(files).filter(file => 
        file.type.startsWith('video/') || 
        file.name.endsWith('.mp4') || 
        file.name.endsWith('.webm') || 
        file.name.endsWith('.mov')
      );
      setSelectedFiles(prev => [...prev, ...videoFiles]);
    }
  };
  
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files) {
      const videoFiles = Array.from(files).filter(file => 
        file.type.startsWith('video/') || 
        file.name.endsWith('.mp4') || 
        file.name.endsWith('.webm') || 
        file.name.endsWith('.mov')
      );
      setSelectedFiles(prev => [...prev, ...videoFiles]);
    }
  }, []);
  
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);
  
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  
  const uploadVideos = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one video file');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    
    const results: UploadedVideo[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));
        
        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', file.name);
        formData.append('auto_analyze', autoAnalyze ? 'true' : 'false');
        
        if (selectedProject) {
          formData.append('project_id', selectedProject);
        }
        if (selectedBeneficiary) {
          formData.append('beneficiary_id', selectedBeneficiary);
        }
        
        const response = await videoAnalysisApi.uploadPrerecordedVideo(formData);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        results.push({
          id: i,
          file_name: file.name,
          file_size: file.size,
          video_id: response.video_id,
          analysis_status: response.analysis_status || 'pending',
          analysis_summary: response.analysis_summary,
          confidence_score: response.confidence_score
        });
        
      } catch (err: any) {
        console.error(`Failed to upload ${file.name}:`, err);
        results.push({
          id: i,
          file_name: file.name,
          file_size: file.size,
          video_id: 0,
          analysis_status: 'failed',
          error: err.message || 'Upload failed'
        });
      }
    }
    
    setUploadedVideos(prev => [...prev, ...results]);
    setSelectedFiles([]);
    setUploadProgress({});
    setIsUploading(false);
    setShowUploadModal(false);
    
    const successful = results.filter(r => r.analysis_status !== 'failed').length;
    if (successful > 0) {
      setSuccess(`Successfully uploaded ${successful} of ${results.length} videos`);
    }
    if (successful < results.length) {
      setError(`${results.length - successful} videos failed to upload`);
    }
  };
  
  const triggerAnalysis = async (videoId: number) => {
    try {
      setUploadedVideos(prev => prev.map(v => 
        v.video_id === videoId ? { ...v, analysis_status: 'processing' } : v
      ));
      
      const response = await videoAnalysisApi.analyzeVideo(videoId);
      
      if (response.success) {
        setUploadedVideos(prev => prev.map(v => 
          v.video_id === videoId ? { 
            ...v, 
            analysis_status: 'completed',
            analysis_summary: response.summary,
            confidence_score: response.confidence_score
          } : v
        ));
        setSuccess('Analysis completed successfully');
      } else {
        setUploadedVideos(prev => prev.map(v => 
          v.video_id === videoId ? { ...v, analysis_status: 'failed', error: response.error } : v
        ));
        setError(response.error || 'Analysis failed');
      }
    } catch (err: any) {
      setUploadedVideos(prev => prev.map(v => 
        v.video_id === videoId ? { ...v, analysis_status: 'failed', error: err.message } : v
      ));
      setError(err.message || 'Analysis failed');
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  // Get selected project and beneficiary names for display
  const getSelectedProjectName = () => {
    const project = projects.find(p => p.id.toString() === selectedProject);
    return project ? `${project.code} - ${project.title}` : '';
  };

  const getSelectedBeneficiaryName = () => {
    const ben = beneficiaries.find(b => b.id.toString() === selectedBeneficiary);
    return ben ? ben.name : '';
  };

  // Stats
  const stats = {
    total: uploadedVideos.length,
    pending: uploadedVideos.filter(v => v.analysis_status === 'pending').length,
    completed: uploadedVideos.filter(v => v.analysis_status === 'completed').length,
    failed: uploadedVideos.filter(v => v.analysis_status === 'failed').length,
  };
  
  return (
    <div className="space-y-6">
      {/* Header - Same style as AIInterviewsManagementPage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Film className="w-8 h-8 text-blue-500 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Upload Pre-recorded Videos</h1>
            <p className="text-sm text-gray-500">
              Upload interview videos for AI analysis
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => navigate('/video-analysis')}>
            <Eye className="w-4 h-4 mr-2" />
            View All Videos
          </Button>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Videos
          </Button>
        </div>
      </div>
      
      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">×</button>
        </div>
      )}
      
      {/* Stats Cards - Same style as AIInterviewsManagementPage */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Uploaded</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Video className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold">{stats.failed}</p>
            </div>
            <XCircle className="w-10 h-10 text-red-500 opacity-50" />
          </div>
        </Card>
      </div>
      
      {/* Quick Upload Drop Zone */}
      <Card className="p-0 overflow-hidden">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => setShowUploadModal(true)}
          className="border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-gray-50 rounded-xl p-12 text-center cursor-pointer transition-all duration-200 m-4"
        >
          <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drop videos here or click to upload
          </p>
          <p className="text-sm text-gray-500">
            Supports MP4, WebM, MOV • Max 500MB per file
          </p>
        </div>
      </Card>
      
      {/* Uploaded Videos Results */}
      {uploadedVideos.length > 0 && (
        <Card>
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Upload Results ({uploadedVideos.length})
            </h3>
            <button
              onClick={() => setUploadedVideos([])}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
          </div>
          
          <div className="divide-y">
            {uploadedVideos.map((video, index) => (
              <div 
                key={index}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center">
                  {getStatusIcon(video.analysis_status)}
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{video.file_name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(video.file_size)}
                      {video.confidence_score !== undefined && (
                        <span className={`ml-2 ${
                          video.confidence_score >= 0.8 ? 'text-green-600' :
                          video.confidence_score >= 0.6 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          • {(video.confidence_score * 100).toFixed(0)}% confidence
                        </span>
                      )}
                    </p>
                    {video.error && (
                      <p className="text-sm text-red-600">{video.error}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANTS[video.analysis_status] || 'default'}>
                    {video.analysis_status}
                  </Badge>
                  
                  {video.analysis_status === 'pending' && video.video_id > 0 && (
                    <Button
                      size="sm"
                      onClick={() => triggerAnalysis(video.video_id)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Analyze
                    </Button>
                  )}
                  
                  {video.analysis_status === 'completed' && video.video_id > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/video-analysis?video=${video.video_id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Instructions Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Linking videos to projects and beneficiaries helps organize analysis results</li>
          <li>• Auto-analyze will immediately process videos after upload</li>
          <li>• For best results, ensure videos are well-lit and show the interviewee clearly</li>
          <li>• Analysis typically takes 30-60 seconds per video</li>
        </ul>
      </Card>
      
      {/* Upload Modal - Same style as AIInterviewsManagementPage Create Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedFiles([]);
        }}
        title="Upload Pre-recorded Videos"
      >
        <div className="space-y-4">
          {/* Project Selection - Same pattern as AIInterviewsManagementPage */}
          <Select
            label="Project (Optional)"
            name="project"
            value={selectedProject}
            onChange={handleProjectChange}
            options={[
              { value: '', label: 'Select Project' },
              ...projects.map(p => ({ value: p.id.toString(), label: `${p.code} - ${p.title}` }))
            ]}
          />
          
          {/* Beneficiary Selection - Same pattern as AIInterviewsManagementPage */}
          <Select
            label="Beneficiary (Optional)"
            name="beneficiary"
            value={selectedBeneficiary}
            onChange={(e) => setSelectedBeneficiary(e.target.value)}
            options={[
              { value: '', label: selectedProject ? 'Select Beneficiary' : 'Select Project First' },
              ...beneficiaries.map(b => ({ 
                value: b.id.toString(), 
                label: `${b.name}${b.phone ? ` • ${b.phone}` : ''}${b.village ? ` • ${b.village}` : ''}` 
              }))
            ]}
            disabled={!selectedProject}
          />
          
          {/* Auto Analyze Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoAnalyze"
              checked={autoAnalyze}
              onChange={(e) => setAutoAnalyze(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 mr-2 h-4 w-4"
            />
            <label htmlFor="autoAnalyze" className="text-sm font-medium text-gray-700">
              Auto-analyze after upload
            </label>
          </div>
          
          {/* Selected Info Display */}
          {(selectedProject || selectedBeneficiary) && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Uploading to:</strong>{' '}
                {getSelectedProjectName()}
                {selectedBeneficiary && ` → ${getSelectedBeneficiaryName()}`}
              </p>
            </div>
          )}
          
          {/* File Selection Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Videos ({selectedFiles.length} selected)
            </label>
            
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-gray-50 rounded-lg p-6 text-center cursor-pointer transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Drop videos here or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">
                MP4, WebM, MOV • Max 500MB
              </p>
            </div>
            
            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 border rounded-lg max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <div className="flex items-center">
                      <Video className="w-4 h-4 text-blue-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    
                    {uploadProgress[file.name] !== undefined ? (
                      <div className="flex items-center">
                        <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress[file.name]}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{uploadProgress[file.name]}%</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {selectedFiles.length > 0 && (
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Add More
                </button>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
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
              onClick={uploadVideos} 
              disabled={isUploading || selectedFiles.length === 0}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {selectedFiles.length} Video{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PrerecordedVideoUploadPage;