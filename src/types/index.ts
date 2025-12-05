// ============== API TYPES ==============
// src/types/index.ts
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'analyst' | 'field_resource' | 'client';
  role_display: string;
  organization: number | null;
  organization_name: string | null;
  phone: string;
  profile_photo: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadhar_number: string;
  bank_account: string;
  ifsc_code: string;
  daily_rate: number | null;
  education: string;
  languages_known: string;
  experience_years: number;
  is_available: boolean;
  is_active: boolean;
  joined_date: string | null;
  date_joined: string;
}

export interface Organization {
  id: number;
  name: string;
  description: string;
  logo: string | null;
  address: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  user_count: number;
}

export interface Client {
  id: number;
  name: string;
  organization_type: string;
  description: string;
  logo: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  project_count: number;
}

export interface Project {
  id: number;
  title: string;
  code: string;
  description: string;
  objectives: string;
  client: number;
  client_name: string;
  sector: string;
  sector_display: string;
  status: ProjectStatus;
  status_display: string;
  states: string;
  districts: string;
  total_beneficiaries: number;
  sample_size: number;
  sample_percentage: number;
  beneficiary_type: string;
  grant_start_date: string | null;
  grant_end_date: string | null;
  assessment_start_date: string | null;
  assessment_end_date: string | null;
  grant_amount: number | null;
  assessment_budget: number | null;
  project_manager: number | null;
  project_manager_name: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  completion_percentage: number;
  beneficiary_count?: number;
  sampled_count?: number;
  interviewed_count?: number;
}

export type ProjectStatus = 
  | 'draft' 
  | 'planning' 
  | 'in_progress' 
  | 'data_collection' 
  | 'analysis' 
  | 'reporting' 
  | 'completed' 
  | 'on_hold';

export type ProjectSector = 
  | 'education' 
  | 'health' 
  | 'livelihood' 
  | 'agriculture' 
  | 'water_sanitation' 
  | 'women_empowerment' 
  | 'skill_development' 
  | 'microfinance' 
  | 'housing' 
  | 'environment' 
  | 'digital_literacy' 
  | 'other';

export interface Beneficiary {
  id: number;
  project: number;
  beneficiary_id: string;
  name: string;
  father_husband_name: string;
  gender: 'male' | 'female' | 'other';
  gender_display: string;
  age: number | null;
  phone: string;
  village: string;
  block: string;
  district: string;
  state: string;
  pincode: string;
  category: string;
  bpl_status: boolean;
  occupation: string;
  annual_income: number | null;
  grant_amount_received: number | null;
  grant_received_date: string | null;
  grant_purpose: string;
  is_sampled: boolean;
  is_interviewed: boolean;
  additional_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireTemplate {
  id: number;
  name: string;
  description: string;
  sector: QuestionnaireSector;
  sector_display: string;
  template_type: TemplateType;
  template_type_display: string;
  beneficiary_unit: BeneficiaryUnit;
  beneficiary_unit_display: string;
  version: string;
  is_active: boolean;
  is_default: boolean;
  ai_interview_enabled: boolean;
  estimated_duration_minutes: number;
  ai_system_prompt: string;
  ai_cultural_context: string;
  tags: string[];
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  total_sections: number;
  total_questions: number;
  section_count: number;
  question_count: number;
  sections?: QuestionnaireSection[];
}

export interface QuestionnaireSection {
  id: number;
  template: number;
  title: string;
  description: string;
  order: number;
  section_type: SectionType;
  is_conditional: boolean;
  condition_rules: Record<string, unknown>;
  ai_section_intro: string;
  questions: Question[];
  question_count: number;
}

export interface Question {
  id: number;
  section: number;
  section_title?: string;
  text: string;
  text_local: Record<string, string>;
  help_text: string;
  question_type: QuestionType;
  question_type_display?: string;
  category: QuestionCategory;
  options: string[];
  options_local: Record<string, string[]>;
  validation_rules: Record<string, unknown>;
  is_required: boolean;
  order: number;
  scoring_weight: number;
  scoring_rules: Record<string, unknown>;
  ai_probing_hints: string;
  expected_answer_format: string;
  ai_verification_questions: string[];
  sensitivity_level: SensitivityLevel;
  red_flag_rules: Record<string, unknown>;
  depends_on: number | null;
  depends_on_value: string;
  depends_on_operator: string;
  localized_text?: string;
  localized_options?: string[];
}

export type QuestionnaireSector = 
  | 'agriculture'
  | 'education'
  | 'healthcare'
  | 'women_empowerment'
  | 'livelihood'
  | 'wash'
  | 'housing'
  | 'financial_inclusion'
  | 'child_welfare'
  | 'disability'
  | 'elderly_care'
  | 'youth_development'
  | 'environment'
  | 'disaster_relief'
  | 'tribal_welfare'
  | 'urban_poor'
  | 'migration'
  | 'legal_aid'
  | 'mental_health'
  | 'digital_empowerment'
  | 'skill_development'
  | 'microfinance'
  | 'general';

export type TemplateType = 
  | 'baseline'
  | 'endline'
  | 'midline'
  | 'monitoring'
  | 'impact'
  | 'satisfaction'
  | 'verification';

export type BeneficiaryUnit = 
  | 'individual'
  | 'household'
  | 'group'
  | 'community'
  | 'institution';

export type SectionType = 
  | 'universal'
  | 'situational'
  | 'sector_specific'
  | 'impact_evaluation'
  | 'demographics'
  | 'economic'
  | 'verification'
  | 'custom';

export type QuestionType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'decimal'
  | 'currency'
  | 'percentage'
  | 'date' 
  | 'time' 
  | 'datetime' 
  | 'single_choice' 
  | 'multiple_choice' 
  | 'dropdown' 
  | 'rating'
  | 'rating_10'
  | 'likert' 
  | 'yes_no' 
  | 'yes_no_na' 
  | 'file' 
  | 'image' 
  | 'location' 
  | 'signature'
  | 'matrix'
  | 'ranking'
  | 'slider';

export type QuestionCategory = 
  | 'identification'
  | 'household'
  | 'economic'
  | 'education'
  | 'health'
  | 'time_availability'
  | 'mobility'
  | 'family_dynamics'
  | 'intervention'
  | 'outcomes'
  | 'sustainability'
  | 'verification'
  | 'custom';

export type SensitivityLevel = 
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';

// Questionnaire Display Labels
export const SECTOR_LABELS: Record<QuestionnaireSector, string> = {
  agriculture: 'Agriculture & Rural Development',
  education: 'Education',
  healthcare: 'Healthcare & Nutrition',
  women_empowerment: 'Women Empowerment',
  livelihood: 'Livelihood & Microenterprise',
  wash: 'Water, Sanitation & Hygiene (WASH)',
  housing: 'Housing & Infrastructure',
  financial_inclusion: 'Financial Inclusion',
  child_welfare: 'Child Welfare & Protection',
  disability: 'Disability Support & Inclusion',
  elderly_care: 'Elderly Care',
  youth_development: 'Youth Development',
  environment: 'Environment & Climate',
  disaster_relief: 'Disaster Relief & Rehabilitation',
  tribal_welfare: 'Tribal & Indigenous Welfare',
  urban_poor: 'Urban Poor & Slum Development',
  migration: 'Migration Support',
  legal_aid: 'Legal Aid & Rights',
  mental_health: 'Mental Health',
  digital_empowerment: 'Digital Empowerment',
  skill_development: 'Skill Development',
  microfinance: 'Microfinance',
  general: 'General Impact Assessment',
};

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  baseline: 'Baseline Assessment',
  endline: 'Endline Assessment',
  midline: 'Midline Assessment',
  monitoring: 'Regular Monitoring',
  impact: 'Impact Evaluation',
  satisfaction: 'Beneficiary Satisfaction',
  verification: 'Verification Survey',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Text (Short)',
  textarea: 'Text (Long)',
  number: 'Number',
  decimal: 'Decimal Number',
  currency: 'Currency Amount',
  percentage: 'Percentage',
  date: 'Date',
  time: 'Time',
  datetime: 'Date & Time',
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  dropdown: 'Dropdown',
  rating: 'Rating Scale (1-5)',
  rating_10: 'Rating Scale (1-10)',
  likert: 'Likert Scale',
  yes_no: 'Yes/No',
  yes_no_na: 'Yes/No/Not Applicable',
  file: 'File Upload',
  image: 'Image Upload',
  location: 'GPS Location',
  signature: 'Signature',
  matrix: 'Matrix/Grid',
  ranking: 'Ranking',
  slider: 'Slider',
};

export const SENSITIVITY_LABELS: Record<SensitivityLevel, string> = {
  low: 'Low - General Information',
  medium: 'Medium - Personal Details',
  high: 'High - Sensitive Information',
  very_high: 'Very High - Extremely Sensitive',
};

export const SECTOR_COLORS: Record<QuestionnaireSector, string> = {
  agriculture: '#10B981',
  education: '#3B82F6',
  healthcare: '#EF4444',
  women_empowerment: '#EC4899',
  livelihood: '#F59E0B',
  wash: '#06B6D4',
  housing: '#8B5CF6',
  financial_inclusion: '#84CC16',
  child_welfare: '#F97316',
  disability: '#6366F1',
  elderly_care: '#14B8A6',
  youth_development: '#A855F7',
  environment: '#22C55E',
  disaster_relief: '#DC2626',
  tribal_welfare: '#D97706',
  urban_poor: '#64748B',
  migration: '#0EA5E9',
  legal_aid: '#7C3AED',
  mental_health: '#DB2777',
  digital_empowerment: '#2563EB',
  skill_development: '#059669',
  microfinance: '#CA8A04',
  general: '#6B7280',
};

// Question Bank Entry
export interface QuestionBankEntry {
  id: number;
  category: string;
  category_display: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  validation_rules: Record<string, unknown>;
  text_local: Record<string, string>;
  options_local: Record<string, string[]>;
  ai_probing_hints: string;
  expected_answer_format: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// Project Questionnaire
export interface ProjectQuestionnaire {
  id: number;
  project: number;
  project_code: string;
  template: number;
  template_name: string;
  template_sector: string;
  name: string;
  display_name: string;
  instructions: string;
  is_active: boolean;
  question_overrides: Record<string, unknown>;
  section_overrides: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  template_details?: QuestionnaireTemplate;
}

// Questionnaire Statistics
export interface QuestionnaireStatistics {
  total_templates: number;
  active_templates: number;
  ai_enabled_templates: number;
  total_sections: number;
  total_questions: number;
  question_bank_entries: number;
  templates_by_sector: Record<string, number>;
  templates_by_type: Record<string, number>;
}

// Sector Info
export interface SectorInfo {
  code: string;
  name: string;
  template_count: number;
}

export interface ResourceAssignment {
  id: number;
  project: number;
  project_code: string;
  project_title: string;
  resource: number;
  resource_name: string;
  resource_phone: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  status_display: string;
  assigned_date: string;
  start_date: string | null;
  end_date: string | null;
  assigned_districts: string;
  assigned_villages: string;
  target_interviews: number;
  completed_interviews: number;
  daily_rate: number | null;
  total_days: number;
  total_amount: number | null;
  amount_paid: number;
  instructions: string;
  notes: string;
  assigned_by: number | null;
  assigned_by_name: string | null;
  created_at: string;
  updated_at: string;
  completion_percentage: number;
}

export interface InterviewResponse {
  id: number;
  project: number;
  project_code: string;
  project_title?: string;
  questionnaire: number;
  beneficiary: number;
  beneficiary_name: string;
  beneficiary_id: string;
  beneficiary_details?: Partial<Beneficiary>;
  interviewer: number | null;
  interviewer_name: string | null;
  interview_date: string;
  interview_start_time: string | null;
  interview_end_time: string | null;
  interview_location: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  status: InterviewStatus;
  status_display: string;
  interviewer_notes: string;
  observations: string;
  impact_score: number | null;
  satisfaction_score: number | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_comments: string;
  photo: string | null;
  audio_recording: string | null;
  consent_signature: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  duration_minutes: number | null;
  answer_count?: number;
  answers?: QuestionAnswer[];
}

export type InterviewStatus = 
  | 'draft' 
  | 'in_progress' 
  | 'submitted' 
  | 'reviewed' 
  | 'approved' 
  | 'rejected';

export interface QuestionAnswer {
  id: number;
  interview: number;
  question: number;
  question_text: string;
  question_type: QuestionType;
  section_title: string;
  text_value: string | null;
  numeric_value: number | null;
  date_value: string | null;
  time_value: string | null;
  datetime_value: string | null;
  selected_options: string[];
  file_value: string | null;
  location_lat: number | null;
  location_lng: number | null;
  is_skipped: boolean;
  skip_reason: string;
  display_value: string;
  created_at: string;
  updated_at: string;
}

// ============== ANALYTICS TYPES ==============

export interface DashboardStats {
  total_users: number;
  field_resources: number;
  available_resources: number;
  total_projects: number;
  active_projects: number;
  total_responses: number;
  pending_responses: number;
  my_assignments?: number;
  my_completed_interviews?: number;
}

export interface ProjectAnalytics {
  project_info: {
    id: number;
    code: string;
    title: string;
    sector: string;
    status: string;
    client: string;
  };
  sampling_progress: {
    total_beneficiaries: number;
    sample_target: number;
    sampled: number;
    interviewed: number;
    completion_percentage: number;
  };
  response_status: Record<InterviewStatus, number>;
  demographics: {
    gender: Record<string, number>;
    category: Record<string, number>;
    age_groups: Record<string, number>;
    bpl_status: Record<string, number>;
  };
  geographic_distribution: {
    by_district: Array<{ district: string; count: number; interviewed: number }>;
    by_state: Array<{ state: string; count: number; interviewed: number }>;
  };
  impact_metrics: {
    average_impact_score: number | null;
    score_distribution: Record<string, number>;
    question_averages: Array<{
      question__id: number;
      question__text: string;
      avg_score: number;
      response_count: number;
    }>;
  };
  interview_timeline: Array<{
    month: string;
    count: number;
    approved: number;
  }>;
  field_resource_performance: Array<{
    resource_name: string;
    target: number;
    completed: number;
    completion_rate: number;
    status: string;
  }>;
}

// ============== API RESPONSE TYPES ==============

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface ApiError {
  detail?: string;
  error?: string;
  [key: string]: unknown;
}

// ============== FORM TYPES ==============

export interface LoginForm {
  username: string;
  password: string;
}

export interface ProjectForm {
  code: string;
  title: string;
  description: string;
  objectives?: string;
  client: number;
  sector: ProjectSector;
  status?: ProjectStatus;
  states?: string;
  districts?: string;
  total_beneficiaries?: number;
  sample_size?: number;
  sample_percentage?: number;
  beneficiary_type?: string;
  grant_start_date?: string;
  grant_end_date?: string;
  assessment_start_date?: string;
  assessment_end_date?: string;
  grant_amount?: number;
  assessment_budget?: number;
  project_manager?: number;
}

export interface UserForm {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  role: User['role'];
  organization?: number;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadhar_number?: string;
  bank_account?: string;
  ifsc_code?: string;
  daily_rate?: number;
  education?: string;
  languages_known?: string;
  experience_years?: number;
  is_available?: boolean;
}

// ============== CONTEXT TYPES ==============

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

// ============== AI INTERVIEW TYPES ==============

export interface AIInterviewSession {
  id: number;
  access_token: string;
  project: number;
  project_code: string;
  project_title: string;
  questionnaire: number;
  questionnaire_name: string;
  beneficiary: number;
  beneficiary_name: string;
  beneficiary_phone: string;
  interview_response: number | null;
  language: string;
  language_display: string;
  status: AIInterviewStatus;
  status_display: string;
  current_section_index: number;
  current_question_index: number;
  total_questions: number;
  answered_questions: number;
  progress_percentage: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string;
  expires_at: string;
  is_expired: boolean;
  interview_url: string;
  ai_model: string;
  tts_voice: string;
  session_notes: string;
}

export type AIInterviewStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'paused' 
  | 'completed' 
  | 'abandoned' 
  | 'expired';

export interface PublicInterviewSession {
  access_token: string;
  project_name: string;
  beneficiary_first_name: string;
  questionnaire_name: string;
  language: string;
  status: AIInterviewStatus;
  total_questions: number;
  answered_questions: number;
  progress_percentage: number;
  total_sections: number;
  current_section_name: string | null;
  is_expired: boolean;
  video_capture_enabled?: boolean;
}

export interface AIInterviewMessage {
  id: number;
  session: number;
  role: 'system' | 'assistant' | 'user';
  role_display: string;
  message_type: string;
  message_type_display: string;
  content: string;
  question: number | null;
  question_text: string | null;
  audio_input: string | null;
  audio_output: string | null;
  transcription_raw: string;
  transcription_confidence: number | null;
  ai_processing_time: number | null;
  tokens_used: number;
  created_at: string;
}

export interface AIInterviewAnswer {
  id: number;
  session: number;
  question: number;
  question_text: string;
  question_type: QuestionType;
  section_title: string;
  raw_response: string;
  interpreted_value: string;
  selected_options: string[];
  numeric_value: number | null;
  date_value: string | null;
  confidence_level: string;
  confidence_level_display: string;
  confidence_score: number | null;
  clarification_needed: boolean;
  clarification_attempts: number;
  ai_reasoning: string;
  is_valid: boolean;
  validation_errors: string[];
  needs_human_review: boolean;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StartInterviewResponse {
  status: string;
  greeting: string;
  greeting_audio_url: string | null;
  session_info: PublicInterviewSession;
  next_question: {
    question_id: number;
    question_text: string;
    question_type: QuestionType;
    options: string[];
    section: string;
  } | null;
}

export interface ProcessAudioResponse {
  transcription: string;
  interpretation: {
    value: string;
    confidence: number;
    needs_clarification: boolean;
  };
  ai_message: string;
  ai_audio_url: string;
  progress: {
    answered: number;
    total: number;
    percentage: number;
  };
  next_question?: {
    question_id: number;
    question_text: string;
    question_type: QuestionType;
    options: string[];
    section: string;
    is_required: boolean;
  };
}

export interface InterviewCompletionResponse {
  status: 'completed';
  message: string;
  audio_url: string;
  summary: {
    total_questions: number;
    answered_questions: number;
    duration_minutes: number;
    needs_review_count: number;
  };
}