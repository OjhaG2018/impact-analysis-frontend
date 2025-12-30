// src/features/interviews/InterviewDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Calendar, Clock, MapPin, Building, FileText,
  CheckCircle, XCircle, PlayCircle, Edit, Trash2, Star, MessageSquare,
  Download, Phone, Mail, AlertCircle, ChevronDown, ChevronUp,
  Eye, Send, Mic, Camera, Video, Image, FileAudio, ExternalLink,
  Activity, History, Sparkles, Globe, Hash, UserCheck, ClipboardList,
  BarChart3, Shield, RefreshCw, Copy, Share2, Printer
} from 'lucide-react';
import api, { endpoints } from '../../api';
import {
  InterviewResponse, InterviewStatus, QuestionAnswer, Project,
  Beneficiary, User as UserType, QuestionnaireTemplate
} from '../../types';
import { Card, Button, Badge, Modal, LoadingSpinner } from '../../components/ui';

// ============== TYPES ==============
interface InterviewDetail extends InterviewResponse {
  answers?: QuestionAnswer[];
  beneficiary_details?: Beneficiary;
  project_details?: Project;
  questionnaire_details?: QuestionnaireTemplate;
  media_files?: MediaFile[];
  activity_log?: ActivityLogEntry[];
}

interface MediaFile {
  id: number;
  file_type: 'image' | 'audio' | 'video' | 'document';
  file_url: string;
  file_name: string;
  uploaded_at: string;
  question_id?: number;
}

interface ActivityLogEntry {
  id: number;
  action: string;
  user_name: string;
  timestamp: string;
  details?: string;
}

// ============== CONSTANTS ==============
const STATUS_CONFIG: Record<InterviewStatus, { 
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; 
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}> = {
  draft: { 
    variant: 'default', 
    label: 'Draft',
    icon: <FileText className="w-4 h-4" />,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700'
  },
  in_progress: { 
    variant: 'warning', 
    label: 'In Progress',
    icon: <PlayCircle className="w-4 h-4" />,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700'
  },
  submitted: { 
    variant: 'info', 
    label: 'Submitted',
    icon: <Send className="w-4 h-4" />,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700'
  },
  reviewed: { 
    variant: 'info', 
    label: 'Under Review',
    icon: <Eye className="w-4 h-4" />,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700'
  },
  approved: { 
    variant: 'success', 
    label: 'Approved',
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700'
  },
  rejected: { 
    variant: 'danger', 
    label: 'Rejected',
    icon: <XCircle className="w-4 h-4" />,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700'
  },
};

const QUESTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <FileText className="w-4 h-4" />,
  textarea: <FileText className="w-4 h-4" />,
  number: <Hash className="w-4 h-4" />,
  single_choice: <CheckCircle className="w-4 h-4" />,
  multiple_choice: <ClipboardList className="w-4 h-4" />,
  dropdown: <ChevronDown className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  yes_no: <CheckCircle className="w-4 h-4" />,
  rating: <Star className="w-4 h-4" />,
  likert: <BarChart3 className="w-4 h-4" />,
  photo: <Camera className="w-4 h-4" />,
  audio: <Mic className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  location: <MapPin className="w-4 h-4" />,
  signature: <Edit className="w-4 h-4" />,
};

// ============== MAIN COMPONENT ==============
const InterviewDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all']));
  const [activeTab, setActiveTab] = useState<'responses' | 'media' | 'activity'>('responses');
  
  // Modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewComments, setReviewComments] = useState('');

  // Load interview data
  useEffect(() => {
    if (id) {
      loadInterview(parseInt(id));
    }
  }, [id]);

  const loadInterview = async (interviewId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<InterviewDetail>(`${endpoints.interviews}${interviewId}/`);
      setInterview(data);
      
      // Expand first section by default
      if (data.answers && data.answers.length > 0) {
        const firstSection = data.answers[0]?.section_title || 'General';
        setExpandedSections(new Set([firstSection]));
      }
    } catch (err: any) {
      console.error('Error loading interview:', err);
      setError(err.message || 'Failed to load interview details');
    }
    setLoading(false);
  };

  // Group answers by section
  const answersBySection = interview?.answers?.reduce((acc, answer) => {
    const section = answer.section_title || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(answer);
    return acc;
  }, {} as Record<string, QuestionAnswer[]>) || {};

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Expand/collapse all
  const toggleAllSections = () => {
    if (expandedSections.size === Object.keys(answersBySection).length) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(Object.keys(answersBySection)));
    }
  };

  // Action handlers
  const handleContinueInterview = () => {
    navigate(`/interviews/${id}/conduct`);
  };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!interview) return;
    setActionLoading(true);
    try {
      await api.post(`${endpoints.interviews}${interview.id}/review/`, {
        action,
        comments: reviewComments,
      });
      setShowReviewModal(false);
      setReviewComments('');
      loadInterview(interview.id);
    } catch (err: any) {
      setError(err.message || 'Review action failed');
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!interview) return;
    setActionLoading(true);
    try {
      await api.delete(`${endpoints.interviews}${interview.id}/`);
      navigate('/interviews');
    } catch (err: any) {
      setError(err.message || 'Failed to delete interview');
    }
    setActionLoading(false);
  };

  const handleExport = () => {
    if (!interview) return;
    const dataStr = JSON.stringify(interview, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview_${interview.id}_${interview.beneficiary_name?.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render answer value
  const renderAnswerValue = (answer: QuestionAnswer) => {
    if (answer.display_value) {
      return answer.display_value;
    }
    
    if (answer.selected_options && answer.selected_options.length > 0) {
      return (
        <div className="flex flex-wrap gap-2">
          {answer.selected_options.map((opt, idx) => (
            <span key={idx} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-sm">
              {opt}
            </span>
          ))}
        </div>
      );
    }
    
    if (answer.numeric_value !== null && answer.numeric_value !== undefined) {
      // Check if it's a rating
      if (answer.question_type === 'rating') {
        return (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <Star 
                key={star}
                className={`w-5 h-5 ${star <= answer.numeric_value! ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
              />
            ))}
            <span className="ml-2 font-medium">{answer.numeric_value}/5</span>
          </div>
        );
      }
      return answer.numeric_value.toString();
    }
    
    if (answer.date_value) {
      return new Date(answer.date_value).toLocaleDateString();
    }
    
    if (answer.text_value) {
      return answer.text_value;
    }
    
    if (answer.file_value) {
      return (
        <a 
          href={answer.file_value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
        >
          <ExternalLink className="w-4 h-4" />
          View File
        </a>
      );
    }
    
    return <span className="text-gray-400 italic">No response</span>;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error || !interview) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/interviews')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Interviews
        </button>
        
        <Card className="p-12 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Interview not found'}
          </h2>
          <p className="text-gray-500 mb-4">
            The interview you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate('/interviews')}>
            Return to Interviews
          </Button>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[interview.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/interviews')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Interviews
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Interview #{interview.id}
            </h1>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`}>
              {statusConfig.icon}
              <span className="font-medium text-sm">{statusConfig.label}</span>
            </div>
          </div>
          
          <p className="text-gray-500">
            {interview.project_code} • {new Date(interview.interview_date).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadInterview(interview.id)}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          
          {['draft', 'in_progress'].includes(interview.status) && (
            <Button size="sm" onClick={handleContinueInterview}>
              <Edit className="w-4 h-4" /> Continue Interview
            </Button>
          )}
          
          {interview.status === 'submitted' && (
            <Button size="sm" onClick={() => setShowReviewModal(true)}>
              <CheckCircle className="w-4 h-4" /> Review
            </Button>
          )}
          
          {['draft', 'rejected'].includes(interview.status) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Beneficiary Card */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Beneficiary
            </h3>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">{interview.beneficiary_name}</p>
                <p className="text-sm text-gray-500">{interview.beneficiary_id}</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              {interview.beneficiary_details?.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{interview.beneficiary_details.phone}</span>
                </div>
              )}
              {interview.beneficiary_details?.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{interview.beneficiary_details.phone}</span>
                </div>
              )}
              {(interview.beneficiary_details?.village || interview.beneficiary_details?.district) && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>
                    {[
                      interview.beneficiary_details?.village,
                      interview.beneficiary_details?.district,
                      interview.beneficiary_details?.state
                    ].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
            
            {interview.beneficiary && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => navigate(`/beneficiaries/${interview.beneficiary}`)}
              >
                View Full Profile
              </Button>
            )}
          </Card>

          {/* Interview Details Card */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              Interview Details
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Project</p>
                  <p className="font-medium text-gray-900">{interview.project_code}</p>
                  {interview.project_details?.title && (
                    <p className="text-sm text-gray-600">{interview.project_details.title}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(interview.interview_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <UserCheck className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Interviewer</p>
                  <p className="font-medium text-gray-900">{interview.interviewer_name || 'Not assigned'}</p>
                </div>
              </div>
              
              {interview.interview_location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-medium text-gray-900">{interview.interview_location}</p>
                  </div>
                </div>
              )}
              
              {interview.duration_minutes && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="font-medium text-gray-900">{interview.duration_minutes} minutes</p>
                  </div>
                </div>
              )}
              
              {/* Questionnaire info would be derived from questionnaire ID */}
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Questionnaire</p>
                  <p className="font-medium text-gray-900">Questionnaire #{interview.questionnaire}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* GPS Location Card */}
          {(interview.gps_latitude && interview.gps_longitude) && (
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                GPS Location
              </h3>
              
              <div className="bg-gray-100 rounded-lg p-4 text-center mb-3">
                <p className="text-sm font-mono text-gray-700">
                  {interview.gps_latitude.toFixed(6)}, {interview.gps_longitude.toFixed(6)}
                </p>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.open(
                  `https://www.google.com/maps?q=${interview.gps_latitude},${interview.gps_longitude}`,
                  '_blank'
                )}
              >
                <ExternalLink className="w-4 h-4" /> View on Map
              </Button>
            </Card>
          )}

          {/* Impact Score Card */}
          {interview.impact_score && (
            <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-600" />
                Impact Score
              </h3>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star}
                      className={`w-8 h-8 ${star <= interview.impact_score! ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <p className="text-3xl font-bold text-amber-600">{interview.impact_score}/5</p>
                <p className="text-sm text-gray-600 mt-1">Overall Impact Rating</p>
              </div>
            </Card>
          )}

          {/* Review Info Card */}
          {interview.reviewed_by && (
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Review Information
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Reviewed By</p>
                  <p className="font-medium text-gray-900">{interview.reviewed_by_name}</p>
                </div>
                {interview.reviewed_at && (
                  <div>
                    <p className="text-gray-500">Reviewed At</p>
                    <p className="font-medium text-gray-900">
                      {new Date(interview.reviewed_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {interview.review_comments && (
                  <div>
                    <p className="text-gray-500">Comments</p>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg mt-1">
                      {interview.review_comments}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Notes Card */}
          {(interview.interviewer_notes || interview.observations) && (
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Notes & Observations
              </h3>
              
              {interview.interviewer_notes && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Interviewer Notes</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {interview.interviewer_notes}
                  </p>
                </div>
              )}
              
              {interview.observations && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Observations</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {interview.observations}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Column - Responses */}
        <div className="lg:col-span-2">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('responses')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'responses' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Responses ({interview.answers?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'media' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Image className="w-4 h-4" />
              Media
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'activity' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              Activity
            </button>
          </div>

          {/* Responses Tab */}
          {activeTab === 'responses' && (
            <Card className="overflow-hidden">
              {/* Section Header */}
              <div className="px-5 py-4 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Interview Responses
                </h3>
                <button
                  onClick={toggleAllSections}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {expandedSections.size === Object.keys(answersBySection).length ? 'Collapse All' : 'Expand All'}
                </button>
              </div>

              {Object.keys(answersBySection).length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No responses recorded yet</p>
                  {['draft', 'in_progress'].includes(interview.status) && (
                    <Button className="mt-4" onClick={handleContinueInterview}>
                      Start Recording Responses
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {Object.entries(answersBySection).map(([sectionTitle, sectionAnswers]) => (
                    <div key={sectionTitle}>
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(sectionTitle)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {expandedSections.has(sectionTitle) ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="font-medium text-gray-900">{sectionTitle}</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {sectionAnswers.length} questions
                          </span>
                        </div>
                      </button>

                      {/* Section Questions */}
                      {expandedSections.has(sectionTitle) && (
                        <div className="bg-gray-50 px-5 py-4 space-y-4">
                          {sectionAnswers.map((answer, idx) => (
                            <div 
                              key={answer.id} 
                              className="bg-white rounded-lg p-4 border border-gray-200"
                            >
                              <div className="flex items-start gap-3 mb-3">
                                <span className="flex-shrink-0 w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-sm font-medium">
                                  {idx + 1}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-gray-900 font-medium">
                                      {answer.question_text}
                                    </p>
                                    <span className="flex-shrink-0 text-gray-400">
                                      {QUESTION_TYPE_ICONS[answer.question_type] || <FileText className="w-4 h-4" />}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="ml-10 p-3 bg-emerald-50 rounded-lg">
                                <p className="text-sm text-gray-500 mb-1">Response:</p>
                                <div className="text-gray-900">
                                  {renderAnswerValue(answer)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <Card className="p-6">
              <div className="text-center py-12">
                <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Media Files</h3>
                <p className="text-gray-500 mb-4">
                  Photos, audio recordings, and documents attached to this interview
                </p>
                {interview.media_files && interview.media_files.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                    {interview.media_files.map(file => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {file.file_type === 'image' && <Image className="w-8 h-8 text-blue-500 mx-auto mb-2" />}
                        {file.file_type === 'audio' && <FileAudio className="w-8 h-8 text-purple-500 mx-auto mb-2" />}
                        {file.file_type === 'video' && <Video className="w-8 h-8 text-red-500 mx-auto mb-2" />}
                        {file.file_type === 'document' && <FileText className="w-8 h-8 text-gray-500 mx-auto mb-2" />}
                        <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                        <p className="text-xs text-gray-500">{new Date(file.uploaded_at).toLocaleDateString()}</p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No media files attached</p>
                )}
              </div>
            </Card>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Activity Timeline</h3>
              
              <div className="space-y-4">
                {/* Created */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Plus className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Interview Created</p>
                    <p className="text-sm text-gray-500">
                      {interview.created_at 
                        ? new Date(interview.created_at).toLocaleString()
                        : new Date(interview.interview_date).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {/* Status changes would be shown here */}
                {interview.status !== 'draft' && (
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${statusConfig.bgColor}`}>
                      {statusConfig.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Status: {statusConfig.label}</p>
                      <p className="text-sm text-gray-500">
                        {interview.updated_at 
                          ? new Date(interview.updated_at).toLocaleString()
                          : 'Date unknown'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Reviewed */}
                {interview.reviewed_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Reviewed by {interview.reviewed_by_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(interview.reviewed_at).toLocaleString()}
                      </p>
                      {interview.review_comments && (
                        <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                          "{interview.review_comments}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Review Interview"
      >
        <div className="space-y-4">
          <Card className="p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Beneficiary</p>
                <p className="font-medium">{interview.beneficiary_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Project</p>
                <p className="font-medium">{interview.project_code}</p>
              </div>
              <div>
                <p className="text-gray-500">Responses</p>
                <p className="font-medium">{interview.answers?.length || 0} answers</p>
              </div>
              <div>
                <p className="text-gray-500">Interviewer</p>
                <p className="font-medium">{interview.interviewer_name || '-'}</p>
              </div>
            </div>
          </Card>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Comments
            </label>
            <textarea
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              rows={4}
              placeholder="Add any comments or feedback..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => handleReview('reject')}
              disabled={actionLoading}
            >
              <XCircle className="w-4 h-4" /> Reject
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleReview('approve')}
              disabled={actionLoading}
            >
              <CheckCircle className="w-4 h-4" /> Approve
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Interview"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-600 mt-1">
                All responses and media associated with this interview will be permanently deleted.
              </p>
            </div>
          </div>

          <p className="text-gray-600">
            Are you sure you want to delete the interview for <strong>{interview.beneficiary_name}</strong>?
          </p>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading ? 'Deleting...' : 'Delete Interview'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Plus icon for timeline
const Plus: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export default InterviewDetailPage;