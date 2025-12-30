// src/api/index.ts
import { 
  AuthTokens, 
  PaginatedResponse,
  QuestionnaireTemplate,
  QuestionnaireSection,
  Question,
  QuestionBankEntry,
  ProjectQuestionnaire,
  QuestionnaireStatistics,
  SectorInfo,
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://impact.rtcknowledge.com/api';
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      const err: any = new Error(error.detail || error.error || 'Request failed');
      err.response = { data: error, status: response.status };
      throw err;
    }
    
    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }
    
    return response.json();
  }

  // Auth endpoints - CHANGED: /token/ -> /core/login/
  async login(username: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${API_BASE_URL}/core/login/`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ username, password }),
    });
    return this.handleResponse<AuthTokens>(response);
  }

  // CHANGED: /token/refresh/ -> /core/token/refresh/
  async refreshToken(refresh: string): Promise<{ access: string }> {
    const response = await fetch(`${API_BASE_URL}/core/token/refresh/`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ refresh }),
    });
    return this.handleResponse<{ access: string }>(response);
  }

  // Generic CRUD methods
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T, D = unknown>(endpoint: string, data: D): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async patch<T, D = unknown>(endpoint: string, data: D): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async put<T, D = unknown>(endpoint: string, data: D): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Delete failed' }));
      throw new Error(error.detail || 'Delete failed');
    }
  }

  // File upload
  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  // Download file
  async downloadFile(endpoint: string, filename: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const api = new ApiService();

// Typed API endpoints
export const endpoints = {
  // Core
  currentUser: '/core/me/',
  users: '/core/users/',
  fieldResources: '/core/users/field_resources/',
  availableResources: '/core/users/available_resources/',
  dashboardStats: '/core/dashboard-stats/',
  changePassword: '/core/change-password/',
  organizations: '/core/organizations/',
  auditLogs: '/core/audit-logs/',
  
  // Password Reset (NEW)
  passwordResetRequest: '/core/password-reset/request/',
  passwordResetValidate: '/core/password-reset/validate/',
  passwordResetConfirm: '/core/password-reset/confirm/',

  // Projects
  projects: '/projects/',
  clients: '/projects/clients/',
  beneficiaries: '/projects/beneficiaries/',
  projectDocuments: '/projects/documents/',
  
  // Questionnaires
  templates: '/questionnaires/templates/',
  sections: '/questionnaires/sections/',
  questions: '/questionnaires/questions/',
  projectQuestionnaires: '/questionnaires/project-questionnaires/',
  questionBank: '/questionnaires/question-bank/',
  questionnaireStatistics: '/questionnaires/statistics/',
  questionnaireTags: '/questionnaires/tags/',

  // Resources
  assignments: '/resources/assignments/',
  beneficiaryAssignments: '/resources/beneficiary-assignments/',
  attendance: '/resources/attendance/',
  expenses: '/resources/expenses/',

  // Responses
  interviews: '/responses/interviews/',
  answers: '/responses/answers/',
  media: '/responses/media/',

  // Analytics
  reports: '/analytics/reports/',
  projectAnalytics: (id: number) => `/analytics/project/${id}/`,
  questionAnalytics: (projectId: number, questionId: number) => 
    `/analytics/project/${projectId}/question/${questionId}/`,
  crossTab: (id: number) => `/analytics/project/${id}/cross-tab/`,
  exportData: (id: number) => `/analytics/project/${id}/export/`,
  compareProjects: '/analytics/compare/',
  
  // AI Interviews
  aiSessions: '/ai-interviews/sessions/',
  aiTemplates: '/ai-interviews/templates/',
  aiSessionTemplates: '/ai-interviews/templates/',
  aiAnswers: '/ai-interviews/answers/',
  aiVideos: '/ai-interviews/videos/',
  aiVideoAnalyses: '/ai-interviews/video-analyses/',
  // AI Interview Video endpoints
  uploadPrerecordedVideo: '/ai-interviews/upload-prerecorded/',
  bulkUploadVideos: '/ai-interviews/upload-prerecorded/bulk/',
  videoList: '/ai-interviews/video-list/',
  triggerBulkAnalysis: '/ai-interviews/trigger-bulk-analysis/',
  analyzeVideo: (videoId: number) => `/ai-interviews/videos/${videoId}/analyze/`,
  serveVideo: (videoId: number) => `/ai-interviews/videos/${videoId}/serve/`,
  
  // Sentiment Analysis endpoints (NEW)
  sentimentAnalyses: '/ai-interviews/sentiment-analyses/',
  sentimentAnalysis: (id: number) => `/ai-interviews/sentiment-analyses/${id}/`,
  sentimentAnalyze: '/ai-interviews/sentiment-analyses/analyze/',
  sentimentBulkAnalyze: '/ai-interviews/sentiment-analyses/bulk_analyze/',
  sentimentReview: (id: number) => `/ai-interviews/sentiment-analyses/${id}/review/`,
  sentimentPendingReview: '/ai-interviews/sentiment-analyses/pending_review/',
  sentimentReport: (id: number) => `/ai-interviews/sentiment-analyses/${id}/report/`,
  sentimentProjectSummary: '/ai-interviews/sentiment-analyses/project_summary/',
  sentimentAnalytics: '/ai-interviews/sentiment-analyses/analytics/',
  
  // Public AI Interview endpoints (no auth)
  publicInterview: (token: string) => `/ai-interviews/public/${token}/`,
  startInterview: (token: string) => `/ai-interviews/public/${token}/start/`,
  processAudio: (token: string) => `/ai-interviews/public/${token}/process-audio/`,
  processText: (token: string) => `/ai-interviews/public/${token}/process-text/`,
  pauseInterview: (token: string) => `/ai-interviews/public/${token}/pause/`,
  stopInterview: (token: string) => `/ai-interviews/public/${token}/stop/`,
  resumeInterview: (token: string) => `/ai-interviews/public/${token}/resume/`,
  resetInterview: (token: string) => `/ai-interviews/public/${token}/reset/`,
  questionAudio: (token: string, questionId: number) => 
    `/ai-interviews/public/${token}/question/${questionId}/audio/`,
  videoSettings: (token: string) => `/ai-interviews/public/${token}/video-settings/`,
  videoConsent: (token: string) => `/ai-interviews/public/${token}/video-consent/`,
  uploadVideo: (token: string) => `/ai-interviews/public/${token}/upload-video/`,
};


// ============== PASSWORD RESET API ==============

export const passwordResetApi = {
  // Request password reset email
  requestReset: async (email: string): Promise<{ message: string }> => {
    return api.post(endpoints.passwordResetRequest, { email });
  },

  // Validate reset token
  validateToken: async (uid: string, token: string): Promise<{
    valid: boolean;
    email?: string;
    username?: string;
    error?: string;
  }> => {
    return api.post(endpoints.passwordResetValidate, { uid, token });
  },

  // Confirm password reset with new password
  confirmReset: async (data: {
    uid: string;
    token: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ message: string }> => {
    return api.post(endpoints.passwordResetConfirm, data);
  },
};


// ============== SENTIMENT ANALYSIS TYPES ==============

export interface SentimentAnalysis {
  id: number;
  video: number;
  question?: number;
  video_analysis?: number;
  
  // Metadata
  analysis_version: string;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  analyzed_at?: string;
  duration_seconds?: number;
  word_count?: number;
  transcript?: string;
  question_context?: string;
  
  // Polarity
  polarity_score: number;
  polarity_label: string;
  polarity_magnitude?: number;
  polarity_confidence?: number;
  polarity_distribution?: Record<string, number>;
  polarity_trajectory?: Array<{ timestamp: number; score: number; label: string }>;
  dominant_phrases?: Array<{ phrase: string; polarity: string; score: number }>;
  
  // Scores
  composite_score: number;
  textual_score?: number;
  visual_score?: number;
  vocal_score?: number;
  score_magnitude?: number;
  score_confidence?: number;
  modality_weights?: Record<string, number>;
  
  // Aspects
  aspect_sentiments?: Array<{
    aspect_id: string;
    name: string;
    category: string;
    score: number;
    confidence: number;
    mentions: number;
    keywords: string[];
  }>;
  aspect_summary?: Record<string, any>;
  
  // Emotions
  primary_emotion: string;
  primary_emotion_confidence?: number;
  secondary_emotion?: string;
  secondary_emotion_confidence?: number;
  emotion_distribution?: Record<string, number>;
  emotion_trajectory?: Array<{ timestamp: number; emotions: Record<string, number> }>;
  emotion_triggers?: Array<{ emotion: string; trigger_text: string; timestamp: number }>;
  secondary_emotions_detected?: string[];
  
  // Authenticity
  authenticity_score?: number;
  text_visual_alignment?: number;
  micro_expressions_detected?: boolean;
  authenticity_notes?: string;
  
  // Intent
  primary_intent?: string;
  primary_intent_confidence?: number;
  secondary_intents?: string[];
  intent_evidence?: string[];
  implicit_intents?: string[];
  social_desirability_score?: number;
  
  // Quality
  analysis_confidence: number;
  response_coherence?: 'high' | 'medium' | 'low';
  engagement_level?: 'high' | 'medium' | 'low';
  red_flags?: string[];
  quality_indicators?: Record<string, any>;
  
  // Narrative
  executive_summary?: string;
  detailed_findings?: string;
  notable_observations?: string[];
  research_notes?: string;
  
  // Processing
  model_used?: string;
  processing_time_seconds?: number;
  tokens_used?: number;
  error_message?: string;
  
  // Review
  requires_review: boolean;
  reviewed_by?: number;
  reviewed_at?: string;
  review_notes?: string;
  review_adjustments?: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Computed/Display
  sentiment_label?: string;
  has_concerns?: boolean;
  is_complete?: boolean;
  modality_agreement?: number;
  beneficiary_name?: string;
  project_name?: string;
}

export interface SentimentAnalysisSummary {
  id: number;
  video: number;
  analysis_status: string;
  polarity_score: number;
  polarity_label: string;
  primary_emotion: string;
  composite_score: number;
  authenticity_score?: number;
  requires_review: boolean;
  created_at: string;
  beneficiary_name?: string;
}

export interface SentimentAnalyticsData {
  summary: {
    total_analyses: number;
    completed: number;
    pending: number;
    failed: number;
    requires_review: number;
  };
  sentiment_trends: {
    overall_average: number;
    trend_direction: string;
    trend_change: number;
  };
  polarity_distribution: Record<string, number>;
  emotion_distribution: Record<string, number>;
  authenticity_stats: {
    average: number;
    high_confidence: number;
    medium_confidence: number;
    low_confidence: number;
  };
  processing_stats: {
    average_processing_time: number;
    total_tokens_used: number;
  };
}

export interface ProjectSentimentSummary {
  project_id: number;
  project_name: string;
  total_analyses: number;
  completed_analyses: number;
  average_sentiment: number;
  sentiment_distribution: Record<string, number>;
  emotion_breakdown: Record<string, number>;
  average_authenticity: number;
  requires_review_count: number;
  top_aspects?: Array<{ aspect: string; average_sentiment: number }>;
}

export interface SentimentAnalysisReport {
  id: number;
  generated_at: string;
  metadata: {
    video_id: number;
    beneficiary?: string;
    project?: string;
    question?: string;
  };
  polarity_summary: {
    score: number;
    label: string;
    confidence: number;
    distribution: Record<string, number>;
  };
  emotion_summary: {
    primary: string;
    secondary?: string;
    distribution: Record<string, number>;
  };
  authenticity_summary: {
    score: number;
    text_visual_alignment: number;
    concerns: string[];
  };
  narrative: {
    executive_summary: string;
    detailed_findings: string;
    notable_observations: string[];
  };
  recommendations: string[];
}

// ============== SENTIMENT ANALYSIS API ==============

export const sentimentAnalysisApi = {
  // List all sentiment analyses with optional filters
  getAnalyses: async (params?: {
    status?: string;
    video_id?: number;
    project_id?: number;
    polarity?: string;
    emotion?: string;
    needs_review?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<SentimentAnalysisSummary>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return api.get(`${endpoints.sentimentAnalyses}${query ? `?${query}` : ''}`);
  },

  // Get single analysis by ID
  getAnalysis: async (id: number): Promise<SentimentAnalysis> => {
    return api.get(endpoints.sentimentAnalysis(id));
  },

  // Create new analysis record
  createAnalysis: async (data: Partial<SentimentAnalysis>): Promise<SentimentAnalysis> => {
    return api.post(endpoints.sentimentAnalyses, data);
  },

  // Update analysis
  updateAnalysis: async (id: number, data: Partial<SentimentAnalysis>): Promise<SentimentAnalysis> => {
    return api.patch(endpoints.sentimentAnalysis(id), data);
  },

  // Delete analysis
  deleteAnalysis: async (id: number): Promise<void> => {
    return api.delete(endpoints.sentimentAnalysis(id));
  },

  // Trigger sentiment analysis for a video
  analyzeVideo: async (data: {
    video_id: number;
    question_context?: string;
    analysis_type?: 'full' | 'quick' | 'text_only' | 'visual_only';
  }): Promise<{
    success: boolean;
    message: string;
    analysis_id?: number;
    data?: SentimentAnalysis;
    error?: string;
  }> => {
    return api.post(endpoints.sentimentAnalyze, data);
  },

  // Bulk analyze multiple videos
  bulkAnalyze: async (data: {
    video_ids?: number[];
    analyze_all_pending?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    total_requested: number;
    successful: number;
    failed: number;
    results: Array<{
      video_id: number;
      analysis_id?: number;
      status: string;
      error?: string;
    }>;
  }> => {
    return api.post(endpoints.sentimentBulkAnalyze, data);
  },

  // Mark analysis as reviewed
  reviewAnalysis: async (id: number, data: {
    notes?: string;
    clear_review_flag?: boolean;
    adjustments?: Record<string, any>;
  }): Promise<{
    success: boolean;
    message: string;
    reviewed_by?: string;
    reviewed_at?: string;
  }> => {
    return api.post(endpoints.sentimentReview(id), data);
  },

  // Get analyses pending review
  getPendingReview: async (): Promise<SentimentAnalysisSummary[]> => {
    return api.get(endpoints.sentimentPendingReview);
  },

  // Get detailed report for an analysis
  getReport: async (id: number): Promise<SentimentAnalysisReport> => {
    return api.get(endpoints.sentimentReport(id));
  },

  // Get project sentiment summary
  getProjectSummary: async (projectId: number): Promise<ProjectSentimentSummary> => {
    return api.get(`${endpoints.sentimentProjectSummary}?project_id=${projectId}`);
  },

  // Get overall analytics
  getAnalytics: async (): Promise<SentimentAnalyticsData> => {
    return api.get(endpoints.sentimentAnalytics);
  },
};

// ============== VIDEO ANALYSIS API ==============

export const videoAnalysisApi = {
  // Upload single pre-recorded video
  uploadPrerecordedVideo: async (formData: FormData): Promise<any> => {
    return api.uploadFile(endpoints.uploadPrerecordedVideo, formData);
  },

  // Bulk upload videos
  bulkUploadVideos: async (formData: FormData): Promise<any> => {
    return api.uploadFile(endpoints.bulkUploadVideos, formData);
  },

  // Get list of videos with filters
  getVideoList: async (params?: {
    status?: string;
    project_id?: number;
    needs_analysis?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return api.get(`${endpoints.videoList}${query ? `?${query}` : ''}`);
  },

  // Trigger analysis for a single video
  analyzeVideo: async (videoId: number, options?: {
    analysis_type?: string;
    num_frames?: number;
  }): Promise<any> => {
    return api.post(endpoints.analyzeVideo(videoId), options || {
      analysis_type: 'comprehensive',
      num_frames: 5
    });
  },

  // Trigger bulk analysis
  triggerBulkAnalysis: async (data: {
    video_ids?: number[];
    analyze_all_pending?: boolean;
  }): Promise<any> => {
    return api.post(endpoints.triggerBulkAnalysis, data);
  },

  // Get all videos (via viewset)
  getVideos: async (params?: {
    analysis_status?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return api.get(`${endpoints.aiVideos}${query ? `?${query}` : ''}`);
  },

  // Get video analyses
  getVideoAnalyses: async (params?: {
    requires_review?: boolean;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return api.get(`${endpoints.aiVideoAnalyses}${query ? `?${query}` : ''}`);
  },

  // Get pending review analyses
  getPendingReviewAnalyses: async (): Promise<any> => {
    return api.get(`${endpoints.aiVideoAnalyses}pending_review/`);
  },

  // Mark analysis as reviewed
  reviewAnalysis: async (analysisId: number, data: {
    review_notes?: string;
    clear_review_flag?: boolean;
  }): Promise<any> => {
    return api.post(`${endpoints.aiVideoAnalyses}${analysisId}/review/`, data);
  },
};

// ============== QUESTIONNAIRE API ==============

export const questionnaireApi = {
  // Templates
  getTemplates: async (params?: {
    sector?: string;
    template_type?: string;
    is_active?: boolean;
    ai_interview_enabled?: boolean;
    search?: string;
  }): Promise<PaginatedResponse<QuestionnaireTemplate>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return api.get(`${endpoints.templates}${query ? `?${query}` : ''}`);
  },

  getTemplate: async (id: number): Promise<QuestionnaireTemplate> => {
    return api.get(`${endpoints.templates}${id}/`);
  },

  createTemplate: async (data: Partial<QuestionnaireTemplate>): Promise<QuestionnaireTemplate> => {
    return api.post(endpoints.templates, data);
  },

  updateTemplate: async (id: number, data: Partial<QuestionnaireTemplate>): Promise<QuestionnaireTemplate> => {
    return api.patch(`${endpoints.templates}${id}/`, data);
  },

  deleteTemplate: async (id: number): Promise<void> => {
    return api.delete(`${endpoints.templates}${id}/`);
  },

  cloneTemplate: async (id: number, newName?: string): Promise<QuestionnaireTemplate> => {
    return api.post(`${endpoints.templates}${id}/clone/`, { new_name: newName });
  },

  exportTemplate: async (id: number): Promise<Record<string, unknown>> => {
    return api.get(`${endpoints.templates}${id}/export/`);
  },

  importTemplate: async (templateData: Record<string, unknown>): Promise<QuestionnaireTemplate> => {
    return api.post(`${endpoints.templates}import_template/`, { template_data: templateData });
  },

  getTemplateForAIInterview: async (id: number, lang?: string): Promise<QuestionnaireTemplate> => {
    const query = lang ? `?lang=${lang}` : '';
    return api.get(`${endpoints.templates}${id}/for_ai_interview/${query}`);
  },

  getSectors: async (): Promise<SectorInfo[]> => {
    return api.get(`${endpoints.templates}sectors/`);
  },

  getDefaultTemplates: async (): Promise<QuestionnaireTemplate[]> => {
    return api.get(`${endpoints.templates}defaults/`);
  },

  // Sections
  getSections: async (templateId?: number): Promise<QuestionnaireSection[]> => {
    const query = templateId ? `?template=${templateId}` : '';
    return api.get(`${endpoints.sections}${query}`);
  },

  getSection: async (id: number): Promise<QuestionnaireSection> => {
    return api.get(`${endpoints.sections}${id}/`);
  },

  createSection: async (data: Partial<QuestionnaireSection>): Promise<QuestionnaireSection> => {
    return api.post(endpoints.sections, data);
  },

  updateSection: async (id: number, data: Partial<QuestionnaireSection>): Promise<QuestionnaireSection> => {
    return api.patch(`${endpoints.sections}${id}/`, data);
  },

  deleteSection: async (id: number): Promise<void> => {
    return api.delete(`${endpoints.sections}${id}/`);
  },

  reorderSectionQuestions: async (sectionId: number, questionOrder: number[]): Promise<void> => {
    return api.post(`${endpoints.sections}${sectionId}/reorder/`, { question_order: questionOrder });
  },

  // Questions
  getQuestions: async (params?: {
    section?: number;
    template?: number;
    question_type?: string;
    category?: string;
  }): Promise<Question[]> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return api.get(`${endpoints.questions}${query ? `?${query}` : ''}`);
  },

  getQuestion: async (id: number): Promise<Question> => {
    return api.get(`${endpoints.questions}${id}/`);
  },

  createQuestion: async (data: Partial<Question>): Promise<Question> => {
    return api.post(endpoints.questions, data);
  },

  updateQuestion: async (id: number, data: Partial<Question>): Promise<Question> => {
    return api.patch(`${endpoints.questions}${id}/`, data);
  },

  deleteQuestion: async (id: number): Promise<void> => {
    return api.delete(`${endpoints.questions}${id}/`);
  },

  bulkCreateQuestions: async (sectionId: number, questions: Partial<Question>[]): Promise<Question[]> => {
    return api.post(`${endpoints.questions}bulk_create/`, {
      section_id: sectionId,
      questions,
    });
  },

  getQuestionCategories: async (): Promise<Array<{ code: string; name: string }>> => {
    return api.get(`${endpoints.questions}categories/`);
  },

  getQuestionTypes: async (): Promise<Array<{ code: string; name: string }>> => {
    return api.get(`${endpoints.questions}types/`);
  },

  // Question Bank
  getQuestionBank: async (params?: {
    category?: string;
    question_type?: string;
    search?: string;
  }): Promise<PaginatedResponse<QuestionBankEntry>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return api.get(`${endpoints.questionBank}${query ? `?${query}` : ''}`);
  },

  useQuestionFromBank: async (bankEntryId: number, sectionId: number): Promise<Question> => {
    return api.post(`${endpoints.questionBank}${bankEntryId}/use_in_section/`, {
      section_id: sectionId,
    });
  },

  // Project Questionnaires
  getProjectQuestionnaires: async (projectId?: number): Promise<ProjectQuestionnaire[]> => {
    const query = projectId ? `?project=${projectId}` : '';
    return api.get(`${endpoints.projectQuestionnaires}${query}`);
  },

  createProjectQuestionnaire: async (data: {
    project: number;
    template: number;
    name?: string;
    instructions?: string;
  }): Promise<ProjectQuestionnaire> => {
    return api.post(endpoints.projectQuestionnaires, data);
  },

  deleteProjectQuestionnaire: async (id: number): Promise<void> => {
    return api.delete(`${endpoints.projectQuestionnaires}${id}/`);
  },

  // Statistics
  getStatistics: async (): Promise<QuestionnaireStatistics> => {
    return api.get(endpoints.questionnaireStatistics);
  },
};


// ==================== AUDIO TYPES ====================

export interface AudioFile {
  id: number;
  title: string;
  audio_type: string;
  audio_type_display?: string;
  audio_file: string;
  audio_url?: string;
  description?: string;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  audio_format: string;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis_status_display?: string;
  beneficiary_name?: string;
  project_title?: string;
  uploaded_at: string;
  analyzed_at: string | null;
  analyses?: AudioAnalysis[];
}

export interface AudioAnalysis {
  id: number;
  audio: number;
  analysis_type: string;
  transcript: string;
  transcript_language: string;
  transcript_language_name: string;
  transcript_confidence: number;
  transcript_duration: number;
  transcript_word_count: number;

  conversation_summary?: string;
  
  polarity_score: number;
  polarity_label: string;


  polarity_confidence: number;
  primary_emotion: string;
  primary_emotion_confidence: number;
  secondary_emotion?: string;
  emotion_distribution?: Record<string, number>;
  sentiment_label?: string;
  primary_intent?: string;
  primary_intent_confidence?: number;
  analysis_confidence: number;
  response_coherence: string;
  engagement_level: string;
  executive_summary: string;
  detailed_findings?: string;
  notable_observations?: string[];
  key_phrases?: string[];
  red_flags?: string[];
  positive_indicators?: string[];
  requires_review: boolean;
  review_reasons?: string[];
  model_used: string;
  processing_time_seconds: number | null;
  tokens_used: number;
  created_at: string;
}

// ==================== AUDIO API FUNCTIONS ====================

export const audioAnalysisApi = {
  uploadAudio: async (formData: FormData): Promise<any> => {
    return api.uploadFile('/ai-interviews/upload-audio/', formData);
  },
  
  getAudioList: async (params?: {
    status?: string;
    project_id?: number;
    page?: number;
    page_size?: number;
  }): Promise<{ total: number; page: number; page_size: number; results: AudioFile[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.project_id) queryParams.append('project_id', params.project_id.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const url = `/ai-interviews/audio-list/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return api.get(url);
  },
  
  deleteAudioFile: async (id: number): Promise<void> => {
    return api.delete(`/ai-interviews/audio-files/${id}/`);
  },
  
  analyzeAudio: async (audioId: number, options?: {
    analysis_type?: 'transcription' | 'sentiment' | 'comprehensive';
    question_context?: string;
  }): Promise<any> => {
    return api.post(`/ai-interviews/audio-files/${audioId}/analyze/`, options || {});
  },
  
  bulkAnalyzeAudio: async (audioIds?: number[]): Promise<any> => {
    return api.post('/ai-interviews/trigger-bulk-audio-analysis/', {
      audio_ids: audioIds,
      analyze_all_pending: !audioIds || audioIds.length === 0
    });
  },
};


export default api;