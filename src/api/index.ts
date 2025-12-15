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

  // Auth endpoints
  async login(username: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${API_BASE_URL}/token/`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ username, password }),
    });
    return this.handleResponse<AuthTokens>(response);
  }

  async refreshToken(refresh: string): Promise<{ access: string }> {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
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

export default api;