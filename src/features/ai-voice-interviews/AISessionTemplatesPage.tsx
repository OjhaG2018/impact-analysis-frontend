// src/features/ai-voice-interviews/AISessionTemplatesPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Bot, Plus, Search, RefreshCw, Edit, Trash2, Copy, Eye,
  Settings, Mic, Volume2, Clock, MessageSquare, Globe,
  ChevronDown, ChevronUp, CheckCircle, AlertCircle, Sparkles,
  Sliders, FileText, Play, Pause, Video, AudioLines,
  MoreVertical, X, Save, Wand2, Zap, Shield
} from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, Button, Input, Select, Badge, Modal, LoadingSpinner } from '../../components/ui';

// ============== TYPES ==============
interface AISessionTemplate {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  
  // Voice Settings
  voice_provider: 'openai' | 'azure' | 'google' | 'eleven_labs';
  voice_model: string;
  voice_name: string;
  speaking_rate: number;
  pitch: number;
  
  // Language Settings
  default_language: string;
  supported_languages: string[];
  auto_detect_language: boolean;
  
  // Interview Flow
  greeting_template: string;
  closing_template: string;
  clarification_template: string;
  invalid_response_template: string;
  skip_question_template: string;
  
  // AI Behavior
  ai_personality: 'professional' | 'friendly' | 'empathetic' | 'neutral';
  max_clarification_attempts: number;
  allow_skip_questions: boolean;
  require_confirmation: boolean;
  echo_detection_enabled: boolean;
  
  // Timing Settings
  silence_threshold: number;
  silence_duration_ms: number;
  min_recording_time_ms: number;
  max_recording_time_ms: number;
  turn_transition_delay_ms: number;
  session_timeout_minutes: number;
  
  // Media Settings
  video_capture_enabled: boolean;
  video_quality: 'low' | 'medium' | 'high';
  audio_quality: 'low' | 'medium' | 'high';
  noise_suppression: boolean;
  echo_cancellation: boolean;
  
  // Analytics
  sentiment_analysis_enabled: boolean;
  transcription_provider: 'openai' | 'azure' | 'google' | 'deepgram';
  
  // Usage Stats
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
}

interface TemplateFormData {
  name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  
  voice_provider: string;
  voice_model: string;
  voice_name: string;
  speaking_rate: number;
  pitch: number;
  
  default_language: string;
  supported_languages: string[];
  auto_detect_language: boolean;
  
  greeting_template: string;
  closing_template: string;
  clarification_template: string;
  invalid_response_template: string;
  skip_question_template: string;
  
  ai_personality: string;
  max_clarification_attempts: number;
  allow_skip_questions: boolean;
  require_confirmation: boolean;
  echo_detection_enabled: boolean;
  
  silence_threshold: number;
  silence_duration_ms: number;
  min_recording_time_ms: number;
  max_recording_time_ms: number;
  turn_transition_delay_ms: number;
  session_timeout_minutes: number;
  
  video_capture_enabled: boolean;
  video_quality: string;
  audio_quality: string;
  noise_suppression: boolean;
  echo_cancellation: boolean;
  
  sentiment_analysis_enabled: boolean;
  transcription_provider: string;
}

// ============== CONSTANTS ==============
const VOICE_PROVIDERS = [
  { value: 'openai', label: 'OpenAI TTS' },
  { value: 'azure', label: 'Azure Cognitive Services' },
  { value: 'google', label: 'Google Cloud TTS' },
  { value: 'eleven_labs', label: 'ElevenLabs' },
];

const VOICE_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'tts-1', label: 'TTS-1 (Standard)' },
    { value: 'tts-1-hd', label: 'TTS-1 HD (High Quality)' },
  ],
  azure: [
    { value: 'neural', label: 'Neural Voice' },
    { value: 'standard', label: 'Standard Voice' },
  ],
  google: [
    { value: 'wavenet', label: 'WaveNet' },
    { value: 'neural2', label: 'Neural2' },
    { value: 'standard', label: 'Standard' },
  ],
  eleven_labs: [
    { value: 'eleven_multilingual_v2', label: 'Multilingual V2' },
    { value: 'eleven_monolingual_v1', label: 'Monolingual V1' },
  ],
};

const VOICE_NAMES: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'echo', label: 'Echo (Male)' },
    { value: 'fable', label: 'Fable (British)' },
    { value: 'onyx', label: 'Onyx (Deep Male)' },
    { value: 'nova', label: 'Nova (Female)' },
    { value: 'shimmer', label: 'Shimmer (Soft Female)' },
  ],
  azure: [
    { value: 'en-IN-NeerjaNeural', label: 'Neerja (Indian English Female)' },
    { value: 'en-IN-PrabhatNeural', label: 'Prabhat (Indian English Male)' },
    { value: 'hi-IN-SwaraNeural', label: 'Swara (Hindi Female)' },
    { value: 'hi-IN-MadhurNeural', label: 'Madhur (Hindi Male)' },
  ],
  google: [
    { value: 'en-IN-Neural2-A', label: 'Indian English Female' },
    { value: 'en-IN-Neural2-B', label: 'Indian English Male' },
    { value: 'hi-IN-Neural2-A', label: 'Hindi Female' },
    { value: 'hi-IN-Neural2-B', label: 'Hindi Male' },
  ],
  eleven_labs: [
    { value: 'Rachel', label: 'Rachel (Calm Female)' },
    { value: 'Adam', label: 'Adam (Deep Male)' },
    { value: 'Domi', label: 'Domi (Expressive Female)' },
  ],
};

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
];

const AI_PERSONALITIES = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-like' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'empathetic', label: 'Empathetic', description: 'Caring and understanding' },
  { value: 'neutral', label: 'Neutral', description: 'Balanced and objective' },
];

const TRANSCRIPTION_PROVIDERS = [
  { value: 'openai', label: 'OpenAI Whisper' },
  { value: 'azure', label: 'Azure Speech' },
  { value: 'google', label: 'Google Speech-to-Text' },
  { value: 'deepgram', label: 'Deepgram' },
];

const DEFAULT_FORM_DATA: TemplateFormData = {
  name: '',
  description: '',
  is_default: false,
  is_active: true,
  
  voice_provider: 'openai',
  voice_model: 'tts-1',
  voice_name: 'nova',
  speaking_rate: 1.0,
  pitch: 1.0,
  
  default_language: 'en',
  supported_languages: ['en', 'hi'],
  auto_detect_language: false,
  
  greeting_template: 'Hello {beneficiary_name}! I am your AI interviewer. I will be asking you some questions about {project_name}. Please speak clearly and take your time to answer.',
  closing_template: 'Thank you {beneficiary_name} for completing the interview. Your responses have been recorded. Have a great day!',
  clarification_template: 'I didn\'t quite understand that. Could you please repeat your answer?',
  invalid_response_template: 'That doesn\'t seem to match the expected response. Let me repeat the question.',
  skip_question_template: 'Alright, let\'s move to the next question.',
  
  ai_personality: 'friendly',
  max_clarification_attempts: 3,
  allow_skip_questions: true,
  require_confirmation: false,
  echo_detection_enabled: true,
  
  silence_threshold: 2,
  silence_duration_ms: 2000,
  min_recording_time_ms: 1000,
  max_recording_time_ms: 120000,
  turn_transition_delay_ms: 500,
  session_timeout_minutes: 60,
  
  video_capture_enabled: false,
  video_quality: 'medium',
  audio_quality: 'high',
  noise_suppression: true,
  echo_cancellation: true,
  
  sentiment_analysis_enabled: true,
  transcription_provider: 'openai',
};

// ============== MAIN COMPONENT ==============
const AISessionTemplatesPage: React.FC = () => {
  // State
  const [templates, setTemplates] = useState<AISessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AISessionTemplate | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<TemplateFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('basic');
  
  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);
  
  const loadTemplates = async () => {
    setLoading(true);
    try {
      // Try the AI session templates endpoint
      const response = await api.get<{ results: AISessionTemplate[] } | AISessionTemplate[]>(
        endpoints.aiSessionTemplates
      );
      const data = Array.isArray(response) ? response : (response.results || []);
      setTemplates(data);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
      // If endpoint doesn't exist, use mock data for demo
      setTemplates([
        {
          id: 1,
          name: 'Default Template',
          description: 'Standard AI interview configuration for all projects',
          is_default: true,
          is_active: true,
          voice_provider: 'openai',
          voice_model: 'tts-1',
          voice_name: 'nova',
          speaking_rate: 1.0,
          pitch: 1.0,
          default_language: 'en',
          supported_languages: ['en', 'hi', 'bn'],
          auto_detect_language: false,
          greeting_template: DEFAULT_FORM_DATA.greeting_template,
          closing_template: DEFAULT_FORM_DATA.closing_template,
          clarification_template: DEFAULT_FORM_DATA.clarification_template,
          invalid_response_template: DEFAULT_FORM_DATA.invalid_response_template,
          skip_question_template: DEFAULT_FORM_DATA.skip_question_template,
          ai_personality: 'friendly',
          max_clarification_attempts: 3,
          allow_skip_questions: true,
          require_confirmation: false,
          echo_detection_enabled: true,
          silence_threshold: 2,
          silence_duration_ms: 2000,
          min_recording_time_ms: 1000,
          max_recording_time_ms: 120000,
          turn_transition_delay_ms: 500,
          session_timeout_minutes: 60,
          video_capture_enabled: false,
          video_quality: 'medium',
          audio_quality: 'high',
          noise_suppression: true,
          echo_cancellation: true,
          sentiment_analysis_enabled: true,
          transcription_provider: 'openai',
          usage_count: 45,
          last_used_at: '2024-01-15T10:30:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-10T00:00:00Z',
          created_by_name: 'Admin',
        },
        {
          id: 2,
          name: 'Hindi Interview',
          description: 'Optimized for Hindi language interviews with regional voice',
          is_default: false,
          is_active: true,
          voice_provider: 'azure',
          voice_model: 'neural',
          voice_name: 'hi-IN-SwaraNeural',
          speaking_rate: 0.95,
          pitch: 1.0,
          default_language: 'hi',
          supported_languages: ['hi', 'en'],
          auto_detect_language: true,
          greeting_template: 'नमस्ते {beneficiary_name}! मैं आपका AI साक्षात्कारकर्ता हूं।',
          closing_template: 'धन्यवाद {beneficiary_name}! साक्षात्कार पूरा हुआ।',
          clarification_template: 'क्षमा करें, मैं समझ नहीं पाया। कृपया दोबारा बताएं।',
          invalid_response_template: 'यह उत्तर सही नहीं लगता। कृपया फिर से सुनें।',
          skip_question_template: 'ठीक है, अगले प्रश्न पर चलते हैं।',
          ai_personality: 'empathetic',
          max_clarification_attempts: 4,
          allow_skip_questions: true,
          require_confirmation: true,
          echo_detection_enabled: true,
          silence_threshold: 3,
          silence_duration_ms: 2500,
          min_recording_time_ms: 1500,
          max_recording_time_ms: 180000,
          turn_transition_delay_ms: 600,
          session_timeout_minutes: 90,
          video_capture_enabled: true,
          video_quality: 'medium',
          audio_quality: 'high',
          noise_suppression: true,
          echo_cancellation: true,
          sentiment_analysis_enabled: true,
          transcription_provider: 'azure',
          usage_count: 23,
          last_used_at: '2024-01-14T15:00:00Z',
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-01-12T00:00:00Z',
          created_by_name: 'Admin',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActive = 
      activeFilter === 'all' ||
      (activeFilter === 'active' && template.is_active) ||
      (activeFilter === 'inactive' && !template.is_active);
    
    return matchesSearch && matchesActive;
  });
  
  // Handlers
  const handleCreateTemplate = () => {
    setFormData(DEFAULT_FORM_DATA);
    setActiveSection('basic');
    setShowCreateModal(true);
  };
  
  const handleEditTemplate = (template: AISessionTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      is_default: template.is_default,
      is_active: template.is_active,
      voice_provider: template.voice_provider,
      voice_model: template.voice_model,
      voice_name: template.voice_name,
      speaking_rate: template.speaking_rate,
      pitch: template.pitch,
      default_language: template.default_language,
      supported_languages: template.supported_languages,
      auto_detect_language: template.auto_detect_language,
      greeting_template: template.greeting_template,
      closing_template: template.closing_template,
      clarification_template: template.clarification_template,
      invalid_response_template: template.invalid_response_template,
      skip_question_template: template.skip_question_template,
      ai_personality: template.ai_personality,
      max_clarification_attempts: template.max_clarification_attempts,
      allow_skip_questions: template.allow_skip_questions,
      require_confirmation: template.require_confirmation,
      echo_detection_enabled: template.echo_detection_enabled,
      silence_threshold: template.silence_threshold,
      silence_duration_ms: template.silence_duration_ms,
      min_recording_time_ms: template.min_recording_time_ms,
      max_recording_time_ms: template.max_recording_time_ms,
      turn_transition_delay_ms: template.turn_transition_delay_ms,
      session_timeout_minutes: template.session_timeout_minutes,
      video_capture_enabled: template.video_capture_enabled,
      video_quality: template.video_quality,
      audio_quality: template.audio_quality,
      noise_suppression: template.noise_suppression,
      echo_cancellation: template.echo_cancellation,
      sentiment_analysis_enabled: template.sentiment_analysis_enabled,
      transcription_provider: template.transcription_provider,
    });
    setActiveSection('basic');
    setShowEditModal(true);
  };
  
  const handleDuplicateTemplate = (template: AISessionTemplate) => {
    setFormData({
      ...formData,
      name: `${template.name} (Copy)`,
      description: template.description,
      is_default: false,
      is_active: true,
      voice_provider: template.voice_provider,
      voice_model: template.voice_model,
      voice_name: template.voice_name,
      speaking_rate: template.speaking_rate,
      pitch: template.pitch,
      default_language: template.default_language,
      supported_languages: template.supported_languages,
      auto_detect_language: template.auto_detect_language,
      greeting_template: template.greeting_template,
      closing_template: template.closing_template,
      clarification_template: template.clarification_template,
      invalid_response_template: template.invalid_response_template,
      skip_question_template: template.skip_question_template,
      ai_personality: template.ai_personality,
      max_clarification_attempts: template.max_clarification_attempts,
      allow_skip_questions: template.allow_skip_questions,
      require_confirmation: template.require_confirmation,
      echo_detection_enabled: template.echo_detection_enabled,
      silence_threshold: template.silence_threshold,
      silence_duration_ms: template.silence_duration_ms,
      min_recording_time_ms: template.min_recording_time_ms,
      max_recording_time_ms: template.max_recording_time_ms,
      turn_transition_delay_ms: template.turn_transition_delay_ms,
      session_timeout_minutes: template.session_timeout_minutes,
      video_capture_enabled: template.video_capture_enabled,
      video_quality: template.video_quality,
      audio_quality: template.audio_quality,
      noise_suppression: template.noise_suppression,
      echo_cancellation: template.echo_cancellation,
      sentiment_analysis_enabled: template.sentiment_analysis_enabled,
      transcription_provider: template.transcription_provider,
    });
    setActiveSection('basic');
    setShowCreateModal(true);
  };
  
  const handleDeleteTemplate = (template: AISessionTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };
  
  const handlePreviewTemplate = (template: AISessionTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };
  
  const handleSaveTemplate = async (isEdit: boolean) => {
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      if (isEdit && selectedTemplate) {
        await api.put(
          `${endpoints.aiSessionTemplates}${selectedTemplate.id}/`,
          formData
        );
        setSuccess('Template updated successfully');
      } else {
        await api.post(
          endpoints.aiSessionTemplates,
          formData
        );
        setSuccess('Template created successfully');
      }
      
      loadTemplates();
      setShowCreateModal(false);
      setShowEditModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!selectedTemplate) return;
    
    setSaving(true);
    try {
      await api.delete(
        `${endpoints.aiSessionTemplates}${selectedTemplate.id}/`
      );
      setSuccess('Template deleted successfully');
      loadTemplates();
      setShowDeleteModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to delete template');
    } finally {
      setSaving(false);
    }
  };
  
  const handleSetDefault = async (template: AISessionTemplate) => {
    try {
      await api.post(
        `${endpoints.aiSessionTemplates}${template.id}/set_default/`,
        {}
      );
      setSuccess(`"${template.name}" is now the default template`);
      loadTemplates();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to set default');
    }
  };
  
  const handleToggleActive = async (template: AISessionTemplate) => {
    try {
      await api.patch(
        `${endpoints.aiSessionTemplates}${template.id}/`,
        { is_active: !template.is_active }
      );
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to update template');
    }
  };
  
  // Form field change handler
  const handleFormChange = (field: keyof TemplateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Toggle language in supported languages
  const toggleLanguage = (langCode: string) => {
    setFormData(prev => {
      const languages = prev.supported_languages.includes(langCode)
        ? prev.supported_languages.filter(l => l !== langCode)
        : [...prev.supported_languages, langCode];
      return { ...prev, supported_languages: languages };
    });
  };
  
  // Render template card
  const renderTemplateCard = (template: AISessionTemplate) => (
    <Card key={template.id} className="p-5 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            template.is_default 
              ? 'bg-gradient-to-br from-purple-500 to-blue-500' 
              : 'bg-gradient-to-br from-gray-100 to-gray-200'
          }`}>
            <Bot className={`w-6 h-6 ${template.is_default ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              {template.is_default && (
                <Badge variant="info">Default</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 line-clamp-1">{template.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleActive(template)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              template.is_active ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              template.is_active ? 'translate-x-5' : ''
            }`} />
          </button>
          <TemplateMenu
            template={template}
            onEdit={() => handleEditTemplate(template)}
            onDuplicate={() => handleDuplicateTemplate(template)}
            onDelete={() => handleDeleteTemplate(template)}
            onPreview={() => handlePreviewTemplate(template)}
            onSetDefault={() => handleSetDefault(template)}
          />
        </div>
      </div>
      
      {/* Quick Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            {VOICE_PROVIDERS.find(v => v.value === template.voice_provider)?.label || template.voice_provider}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            {LANGUAGES.find(l => l.code === template.default_language)?.name || template.default_language}
            {template.supported_languages.length > 1 && ` +${template.supported_languages.length - 1}`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 capitalize">{template.ai_personality}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {template.video_capture_enabled ? (
            <>
              <Video className="w-4 h-4 text-blue-500" />
              <span className="text-blue-600">Video Enabled</span>
            </>
          ) : (
            <>
              <AudioLines className="w-4 h-4 text-green-500" />
              <span className="text-green-600">Audio Only</span>
            </>
          )}
        </div>
      </div>
      
      {/* Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {template.usage_count} sessions
          </span>
          {template.last_used_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Last used {new Date(template.last_used_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handlePreviewTemplate(template)}
        >
          <Eye className="w-4 h-4 mr-1" /> Preview
        </Button>
      </div>
    </Card>
  );
  
  // Render form sections
  const renderFormSection = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-4">
            <Input
              label="Template Name *"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="e.g., Hindi Interview Template"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Describe when this template should be used..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleFormChange('is_active', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => handleFormChange('is_default', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Set as Default</span>
              </label>
            </div>
          </div>
        );
      
      case 'voice':
        return (
          <div className="space-y-4">
            <Select
              label="Voice Provider"
              value={formData.voice_provider}
              onChange={(e) => {
                handleFormChange('voice_provider', e.target.value);
                handleFormChange('voice_model', VOICE_MODELS[e.target.value]?.[0]?.value || '');
                handleFormChange('voice_name', VOICE_NAMES[e.target.value]?.[0]?.value || '');
              }}
              options={VOICE_PROVIDERS}
            />
            <Select
              label="Voice Model"
              value={formData.voice_model}
              onChange={(e) => handleFormChange('voice_model', e.target.value)}
              options={VOICE_MODELS[formData.voice_provider] || []}
            />
            <Select
              label="Voice"
              value={formData.voice_name}
              onChange={(e) => handleFormChange('voice_name', e.target.value)}
              options={VOICE_NAMES[formData.voice_provider] || []}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Speaking Rate: {formData.speaking_rate.toFixed(2)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={formData.speaking_rate}
                onChange={(e) => handleFormChange('speaking_rate', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0.5x (Slow)</span>
                <span>2.0x (Fast)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pitch: {formData.pitch.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={formData.pitch}
                onChange={(e) => handleFormChange('pitch', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0.5 (Low)</span>
                <span>2.0 (High)</span>
              </div>
            </div>
          </div>
        );
      
      case 'language':
        return (
          <div className="space-y-4">
            <Select
              label="Default Language"
              value={formData.default_language}
              onChange={(e) => handleFormChange('default_language', e.target.value)}
              options={LANGUAGES.map(l => ({ value: l.code, label: `${l.name} (${l.nativeName})` }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supported Languages
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {LANGUAGES.map(lang => (
                  <label
                    key={lang.code}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      formData.supported_languages.includes(lang.code)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.supported_languages.includes(lang.code)}
                      onChange={() => toggleLanguage(lang.code)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">{lang.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.auto_detect_language}
                onChange={(e) => handleFormChange('auto_detect_language', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Auto-detect language from speech</span>
            </label>
          </div>
        );
      
      case 'messages':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Greeting Template
                <span className="text-xs text-gray-400 ml-2">Variables: {'{beneficiary_name}'}, {'{project_name}'}</span>
              </label>
              <textarea
                value={formData.greeting_template}
                onChange={(e) => handleFormChange('greeting_template', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Closing Template
              </label>
              <textarea
                value={formData.closing_template}
                onChange={(e) => handleFormChange('closing_template', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clarification Request
              </label>
              <textarea
                value={formData.clarification_template}
                onChange={(e) => handleFormChange('clarification_template', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invalid Response Message
              </label>
              <textarea
                value={formData.invalid_response_template}
                onChange={(e) => handleFormChange('invalid_response_template', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
        );
      
      case 'behavior':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Personality</label>
              <div className="grid grid-cols-2 gap-2">
                {AI_PERSONALITIES.map(personality => (
                  <label
                    key={personality.value}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.ai_personality === personality.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="personality"
                      value={personality.value}
                      checked={formData.ai_personality === personality.value}
                      onChange={(e) => handleFormChange('ai_personality', e.target.value)}
                      className="hidden"
                    />
                    <div className="font-medium text-sm">{personality.label}</div>
                    <div className="text-xs text-gray-500">{personality.description}</div>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Clarification Attempts: {formData.max_clarification_attempts}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.max_clarification_attempts}
                onChange={(e) => handleFormChange('max_clarification_attempts', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allow_skip_questions}
                  onChange={(e) => handleFormChange('allow_skip_questions', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Allow skipping questions</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.require_confirmation}
                  onChange={(e) => handleFormChange('require_confirmation', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Require answer confirmation</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.echo_detection_enabled}
                  onChange={(e) => handleFormChange('echo_detection_enabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Enable echo detection</span>
              </label>
            </div>
          </div>
        );
      
      case 'timing':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voice Detection Threshold: {formData.silence_threshold}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={formData.silence_threshold}
                onChange={(e) => handleFormChange('silence_threshold', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Very Sensitive</span>
                <span>Less Sensitive</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Silence Duration: {(formData.silence_duration_ms / 1000).toFixed(1)}s
              </label>
              <input
                type="range"
                min="1000"
                max="5000"
                step="500"
                value={formData.silence_duration_ms}
                onChange={(e) => handleFormChange('silence_duration_ms', parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Time to wait after user stops speaking</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Turn Transition Delay: {formData.turn_transition_delay_ms}ms
              </label>
              <input
                type="range"
                min="200"
                max="2000"
                step="100"
                value={formData.turn_transition_delay_ms}
                onChange={(e) => handleFormChange('turn_transition_delay_ms', parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Pause between AI speaking and user turn</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout: {formData.session_timeout_minutes} minutes
              </label>
              <input
                type="range"
                min="15"
                max="180"
                step="15"
                value={formData.session_timeout_minutes}
                onChange={(e) => handleFormChange('session_timeout_minutes', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Recording (ms)
                </label>
                <Input
                  type="number"
                  value={formData.min_recording_time_ms}
                  onChange={(e) => handleFormChange('min_recording_time_ms', parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Recording (ms)
                </label>
                <Input
                  type="number"
                  value={formData.max_recording_time_ms}
                  onChange={(e) => handleFormChange('max_recording_time_ms', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        );
      
      case 'media':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="font-medium text-gray-800">Video Capture</div>
                  <div className="text-xs text-gray-500">Record video during interview</div>
                </div>
              </div>
              <button
                onClick={() => handleFormChange('video_capture_enabled', !formData.video_capture_enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.video_capture_enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  formData.video_capture_enabled ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>
            
            {formData.video_capture_enabled && (
              <Select
                label="Video Quality"
                value={formData.video_quality}
                onChange={(e) => handleFormChange('video_quality', e.target.value)}
                options={[
                  { value: 'low', label: 'Low (360p)' },
                  { value: 'medium', label: 'Medium (480p)' },
                  { value: 'high', label: 'High (720p)' },
                ]}
              />
            )}
            
            <Select
              label="Audio Quality"
              value={formData.audio_quality}
              onChange={(e) => handleFormChange('audio_quality', e.target.value)}
              options={[
                { value: 'low', label: 'Low (16kHz)' },
                { value: 'medium', label: 'Medium (22kHz)' },
                { value: 'high', label: 'High (44.1kHz)' },
              ]}
            />
            
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.noise_suppression}
                  onChange={(e) => handleFormChange('noise_suppression', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Noise Suppression</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.echo_cancellation}
                  onChange={(e) => handleFormChange('echo_cancellation', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Echo Cancellation</span>
              </label>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-800 mb-3">AI Processing</h4>
              <Select
                label="Transcription Provider"
                value={formData.transcription_provider}
                onChange={(e) => handleFormChange('transcription_provider', e.target.value)}
                options={TRANSCRIPTION_PROVIDERS}
              />
              <label className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  checked={formData.sentiment_analysis_enabled}
                  onChange={(e) => handleFormChange('sentiment_analysis_enabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Enable Sentiment Analysis</span>
              </label>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Template form modal content
  const renderFormModal = (isEdit: boolean) => (
    <div className="flex h-[70vh]">
      {/* Sidebar */}
      <div className="w-48 border-r bg-gray-50 p-2 space-y-1 flex-shrink-0">
        {[
          { id: 'basic', icon: FileText, label: 'Basic Info' },
          { id: 'voice', icon: Volume2, label: 'Voice Settings' },
          { id: 'language', icon: Globe, label: 'Languages' },
          { id: 'messages', icon: MessageSquare, label: 'Messages' },
          { id: 'behavior', icon: Sparkles, label: 'AI Behavior' },
          { id: 'timing', icon: Clock, label: 'Timing' },
          { id: 'media', icon: Video, label: 'Media & AI' },
        ].map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              activeSection === section.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {renderFormSection()}
      </div>
    </div>
  );
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Settings className="w-8 h-8 text-purple-500 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Session Templates</h1>
            <p className="text-sm text-gray-500">
              Configure AI voice interview settings and behaviors
            </p>
          </div>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>
      
      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
          <button onClick={() => setError('')}><X className="w-4 h-4 text-red-500" /></button>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}
      
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            {(['all', 'active', 'inactive'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeFilter === filter
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={loadTemplates}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>
      
      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center">
          <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search.' : 'Create your first AI session template.'}
          </p>
          <Button onClick={handleCreateTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTemplates.map(renderTemplateCard)}
        </div>
      )}
      
      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create AI Session Template"
        size="xl"
      >
        {renderFormModal(false)}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleSaveTemplate(false)} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4 mr-2" />}
            Create Template
          </Button>
        </div>
      </Modal>
      
      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Template: ${selectedTemplate?.name}`}
        size="xl"
      >
        {renderFormModal(true)}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleSaveTemplate(true)} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Template"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-600 mt-1">
                The template "{selectedTemplate?.name}" will be permanently deleted.
              </p>
            </div>
          </div>
          
          {selectedTemplate?.usage_count && selectedTemplate.usage_count > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              ⚠️ This template has been used in {selectedTemplate.usage_count} sessions.
            </div>
          )}
          
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirmDelete}
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete Template'}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={`Template Preview: ${selectedTemplate?.name}`}
        size="lg"
      >
        {selectedTemplate && (
          <div className="space-y-6">
            {/* Voice Preview */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-500" />
                Voice Configuration
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Provider:</span>
                  <span className="ml-2 font-medium">
                    {VOICE_PROVIDERS.find(v => v.value === selectedTemplate.voice_provider)?.label}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Voice:</span>
                  <span className="ml-2 font-medium">{selectedTemplate.voice_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Speed:</span>
                  <span className="ml-2 font-medium">{selectedTemplate.speaking_rate}x</span>
                </div>
                <div>
                  <span className="text-gray-500">Pitch:</span>
                  <span className="ml-2 font-medium">{selectedTemplate.pitch}</span>
                </div>
              </div>
            </div>
            
            {/* Messages Preview */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Sample Messages
              </h4>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 font-medium mb-1">Greeting</p>
                  <p className="text-sm text-green-800">{selectedTemplate.greeting_template}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium mb-1">Closing</p>
                  <p className="text-sm text-blue-800">{selectedTemplate.closing_template}</p>
                </div>
              </div>
            </div>
            
            {/* Settings Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">AI Behavior</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Personality</span>
                    <span className="font-medium capitalize">{selectedTemplate.ai_personality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Max Retries</span>
                    <span className="font-medium">{selectedTemplate.max_clarification_attempts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Allow Skip</span>
                    <span className="font-medium">{selectedTemplate.allow_skip_questions ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Timing</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Silence Wait</span>
                    <span className="font-medium">{selectedTemplate.silence_duration_ms / 1000}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Turn Delay</span>
                    <span className="font-medium">{selectedTemplate.turn_transition_delay_ms}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Session Timeout</span>
                    <span className="font-medium">{selectedTemplate.session_timeout_minutes}m</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setShowPreviewModal(false);
                handleEditTemplate(selectedTemplate);
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Template
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============== Template Menu Component ==============
const TemplateMenu: React.FC<{
  template: AISessionTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onSetDefault: () => void;
}> = ({ template, onEdit, onDuplicate, onDelete, onPreview, onSetDefault }) => {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 hover:bg-gray-100 rounded-lg"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
            <button
              onClick={() => { onPreview(); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => { onDuplicate(); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            {!template.is_default && (
              <button
                onClick={() => { onSetDefault(); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Set as Default
              </button>
            )}
            <div className="border-t my-1" />
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
              disabled={template.is_default}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AISessionTemplatesPage;