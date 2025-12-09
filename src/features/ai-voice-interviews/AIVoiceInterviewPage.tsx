// frontend/src/pages/AIVoiceInterviewPage.tsx
// UPDATED: Added VideoCapture integration
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Play, Pause, Volume2, VolumeX, 
  CheckCircle, AlertCircle, Clock, MessageCircle,
  Phone, Globe, ChevronRight, Loader2, RefreshCw,
  Home, HelpCircle, Video, VideoOff
} from 'lucide-react';
import api, { endpoints } from '../../api';
import VideoCapture from '../../components/VideoCapture';
import { 
  PublicInterviewSession, 
  StartInterviewResponse, 
  ProcessAudioResponse,
  InterviewCompletionResponse,
  QuestionType 
} from '../../types';

// Language options
const LANGUAGE_OPTIONS = [
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

// Interview states
type InterviewState = 
  | 'loading' 
  | 'language_select' 
  | 'ready' 
  | 'greeting' 
  | 'listening' 
  | 'processing' 
  | 'speaking' 
  | 'paused'
  | 'completed'
  | 'error'
  | 'expired';

interface ConversationMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  audioUrl?: string;
  timestamp: Date;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const AIVoiceInterviewPage: React.FC = () => {
  const { accessToken } = useParams<{ accessToken: string }>();
  const navigate = useNavigate();
  
  // Session state
  const [session, setSession] = useState<PublicInterviewSession | null>(null);
  const [interviewState, setInterviewState] = useState<InterviewState>('loading');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [error, setError] = useState<string>('');
  
  // Video state
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoConsented, setVideoConsented] = useState(false);
  const [showVideoPanel, setShowVideoPanel] = useState(true);
  
  // Current question state
  const [currentQuestion, setCurrentQuestion] = useState<{
    question_id: number;
    question_text: string;
    question_type: QuestionType;
    options: string[];
    section: string;
    is_required?: boolean;
  } | null>(null);
  
  // Conversation history
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [autoRecordMode, setAutoRecordMode] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [fullRecording, setFullRecording] = useState(false);
  const [fullRecorder, setFullRecorder] = useState<MediaRecorder | null>(null);
  const [showVideoPrompt, setShowVideoPrompt] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of conversation
  const scrollToBottom = useCallback(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [conversation, scrollToBottom]);
  
  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      if (!accessToken) {
        setError('Invalid interview link');
        setInterviewState('error');
        return;
      }
      
      try {
        const data = await api.get<PublicInterviewSession>(
          endpoints.publicInterview(accessToken)
        );
        setSession(data);
        
        // Check if video is enabled for this session
        if (data.video_capture_enabled) {
          setVideoEnabled(true);
        }
        
        if (data.is_expired) {
          setInterviewState('expired');
        } else if (data.status === 'completed') {
          setInterviewState('completed');
        } else if (data.status === 'paused' || data.status === 'in_progress') {
          // Resume existing session
          setSelectedLanguage(data.language);
          setInterviewState('ready');
        } else {
          setInterviewState('language_select');
        }
      } catch (err: any) {
        console.error('Error loading session:', err);
        if (err.response?.status === 410) {
          setInterviewState('expired');
        } else {
          setError(err.message || 'Failed to load interview');
          setInterviewState('error');
        }
      }
    };
    
    loadSession();
  }, [accessToken]);
  
  // Initialize full conversation recorder
  const initializeFullRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
        }
      });
      
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const fullAudio = new Blob(chunks, { type: 'audio/webm' });
        setRecordedAudio(fullAudio);
        setShowUploadOptions(true);
      };
      
      setFullRecorder(recorder);
      return true;
    } catch (err) {
      console.error('Full recorder initialization failed:', err);
      return false;
    }
  };
  
  // Initialize audio recorder
  const initializeRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        await processAudioResponse(audioBlob);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      return true;
    } catch (err) {
      console.error('Microphone access error:', err);
      setError('Please allow microphone access to continue the interview.');
      return false;
    }
  };
  
  // Start the interview
  const startInterview = async () => {
    if (!accessToken) return;
    
    setInterviewState('greeting');
    
    try {
      // Initialize recorders
      const recorderReady = await initializeRecorder();
      const fullRecorderReady = await initializeFullRecorder();
      
      if (!recorderReady) {
        setInterviewState('error');
        return;
      }
      
      // Show video prompt if video is enabled
      if (session?.video_capture_enabled && !videoConsented) {
        setShowVideoPrompt(true);
      }
      
      // Start full recording if available
      if (fullRecorderReady && fullRecorder) {
        fullRecorder.start();
        setFullRecording(true);
      }
      
      const response = await api.post<StartInterviewResponse>(
        endpoints.startInterview(accessToken),
        { 
          language: selectedLanguage,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          }
        }
      );
      
      setSession(response.session_info);
      setCurrentQuestion(response.next_question);
      
      // Add greeting to conversation
      const greetingMsg: ConversationMessage = {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: response.greeting,
        audioUrl: response.greeting_audio_url || undefined,
        timestamp: new Date(),
      };
      setConversation([greetingMsg]);
      
      // Play greeting audio if available
      if (response.greeting_audio_url) {
        try {
          await playAudio(response.greeting_audio_url);
        } catch (err) {
          console.warn('Audio playback failed:', err);
          // Continue without audio
        }
      }
      
      setInterviewState('listening');
      
    } catch (err: any) {
      console.error('Error starting interview:', err);
      setError(err.message || 'Failed to start interview');
      setInterviewState('error');
    }
  };
  
  // Play audio
  const playAudio = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setInterviewState('speaking');
      setIsPlaying(true);
      
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.muted = isMuted;
      
      audio.onended = () => {
        setIsPlaying(false);
        setInterviewState('listening');
        resolve();
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        setInterviewState('listening');
        reject(new Error('Audio playback failed'));
      };
      
      audio.play().catch(reject);
    });
  };
  
  // Start recording
  const startRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    audioChunksRef.current = [];
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setRecordingTime(0);
    
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };
  
  // Stop recording
  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setInterviewState('processing');
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };
  
  // Process audio response
  const processAudioResponse = async (audioBlob: Blob) => {
    if (!accessToken) return;
    
    try {
      // Add user message placeholder
      const userMsg: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: 'Processing your response...',
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, userMsg]);
      
      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Send to API
      const response = await fetch(
        `${API_BASE_URL}/api${endpoints.processAudio(accessToken)}`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to process audio');
      }
      
      const data: ProcessAudioResponse | InterviewCompletionResponse = await response.json();
      
      // Check for transcription failure
      if ('transcription_failed' in data) {
        // Remove the processing message and show text input
        setConversation(prev => prev.filter(m => m.id !== userMsg.id));
        setShowTextInput(true);
        setInterviewState('listening');
        return;
      }
      
      // Update conversation with actual transcription
      setConversation(prev => {
        const updated = [...prev];
        const lastUserMsgIndex = updated.findIndex(m => m.id === userMsg.id);
        if (lastUserMsgIndex !== -1) {
          if ('transcription' in data) {
            updated[lastUserMsgIndex].content = data.transcription;
          }
        }
        return updated;
      });
      
      if ('status' in data && data.status === 'completed') {
        // Interview completed
        const completionData = data as InterviewCompletionResponse;
        const completionMsg: ConversationMessage = {
          id: `completion-${Date.now()}`,
          role: 'assistant',
          content: completionData.message,
          audioUrl: completionData.audio_url,
          timestamp: new Date(),
        };
        setConversation(prev => [...prev, completionMsg]);
        
        if (completionData.audio_url) {
          try {
            await playAudio(completionData.audio_url);
          } catch (err) {
            console.warn('Completion audio playback failed:', err);
          }
        }
        
        setInterviewState('completed');
        
        // Stop full recording when interview completes
        if (fullRecorder && fullRecording) {
          fullRecorder.stop();
          setFullRecording(false);
        } else {
          // Show upload options even if no recording
          setTimeout(() => setShowUploadOptions(true), 1000);
        }
      } else {
        const processData = data as ProcessAudioResponse;
        
        // Add AI response
        const aiMsg: ConversationMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: processData.ai_message,
          audioUrl: processData.ai_audio_url,
          timestamp: new Date(),
        };
        setConversation(prev => [...prev, aiMsg]);
        
        // Update progress
        if (session) {
          setSession({
            ...session,
            answered_questions: processData.progress.answered,
            progress_percentage: processData.progress.percentage,
          });
        }
        
        // Update current question
        if (processData.next_question) {
          setCurrentQuestion(processData.next_question);
        }
        
        // Play AI response if available
        if (processData.ai_audio_url) {
          try {
            await playAudio(processData.ai_audio_url);
          } catch (err) {
            console.warn('AI audio playback failed:', err);
            setInterviewState('listening');
          }
        } else {
          setInterviewState('listening');
        }
        
        // Auto-start recording if enabled and no text input showing
        if (autoRecordMode && !showTextInput) {
          setTimeout(() => {
            if (mediaRecorderRef.current && !isRecording) {
              startRecording();
            }
          }, 1000);
        }
      }
      
    } catch (err: any) {
      console.error('Error processing audio:', err);
      // Only show text input if it's a network/API error, not transcription error
      if (err.message?.includes('Failed to process audio')) {
        setShowTextInput(true);
      }
      setInterviewState('listening');
    }
  };
  
  // Process text response
  const processTextResponse = async (text: string) => {
    if (!accessToken) return;
    
    setInterviewState('processing');
    setShowTextInput(false);
    setTextInput('');
    
    // Add user message
    const userMsg: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setConversation(prev => [...prev, userMsg]);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api${endpoints.processText(accessToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        }
      );
      
      const data = await response.json();
      
      if ('status' in data && data.status === 'completed') {
        const completionMsg: ConversationMessage = {
          id: `completion-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };
        setConversation(prev => [...prev, completionMsg]);
        setInterviewState('completed');
        
        if (fullRecorder && fullRecording) {
          fullRecorder.stop();
          setFullRecording(false);
        }
      } else {
        const aiMsg: ConversationMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.ai_message,
          timestamp: new Date(),
        };
        setConversation(prev => [...prev, aiMsg]);
        
        if (session) {
          setSession({
            ...session,
            answered_questions: data.progress.answered,
            progress_percentage: data.progress.percentage,
          });
        }
        
        if (data.next_question) {
          setCurrentQuestion(data.next_question);
        }
        
        setInterviewState('listening');
      }
    } catch (err) {
      console.error('Error processing text:', err);
      setError('Failed to process response. Please try again.');
      setInterviewState('listening');
    }
  };
  
  // Pause interview
  const pauseInterview = async () => {
    if (!accessToken) return;
    
    try {
      await api.post(endpoints.pauseInterview(accessToken), {});
      setInterviewState('paused');
    } catch (err) {
      console.error('Error pausing interview:', err);
    }
  };
  
  // Resume interview
  const resumeInterview = async () => {
    if (!accessToken) return;
    
    try {
      const response = await api.post<any>(endpoints.resumeInterview(accessToken), {});
      setInterviewState('listening');
      if (response.current_question) {
        setCurrentQuestion(response.current_question);
      }
    } catch (err) {
      console.error('Error resuming interview:', err);
    }
  };
  
  // Handle video consent
  const handleVideoConsentChange = (consented: boolean) => {
    setVideoConsented(consented);
  };
  
  // Handle video uploaded
  const handleVideoUploaded = (videoId: number) => {
    console.log('Video uploaded:', videoId);
    // You could show a toast notification here
  };
  
  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Render based on state
  const renderContent = () => {
    switch (interviewState) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">Loading interview...</p>
          </div>
        );
      
      case 'expired':
        return (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Interview Link Expired</h2>
            <p className="text-gray-600 mb-6">
              This interview link has expired. Please contact the organization for a new link.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Home
            </button>
          </div>
        );
      
      case 'error':
        return (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </button>
          </div>
        );
      
      case 'language_select':
        return (
          <div className="max-w-md mx-auto py-8">
            <div className="text-center mb-8">
              <Globe className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Welcome, {session?.beneficiary_first_name}!
              </h2>
              <p className="text-gray-600">
                You're about to begin the {session?.questionnaire_name} assessment.
                Please select your preferred language.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Language
              </label>
              <div className="grid grid-cols-2 gap-3">
                {LANGUAGE_OPTIONS.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedLanguage === lang.code
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{lang.nativeName}</div>
                    <div className="text-sm text-gray-500">{lang.name}</div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setInterviewState('ready')}
                className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        );
      
      case 'ready':
        return (
          <div className="max-w-md mx-auto py-8">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setInterviewState('language_select')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Go back"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-bold text-gray-800 ml-2">
                Ready to Begin
              </h2>
            </div>
            <div className="text-center mb-8">
              <Mic className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                This interview will be conducted by an AI assistant.
                You can speak your answers naturally.
              </p>
              
              <div className="bg-blue-50 rounded-lg p-4 text-left mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">Tips:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Find a quiet place with good internet</li>
                  <li>• Speak clearly into your phone</li>
                  <li>• Take your time to think before answering</li>
                  <li>• You can pause and resume anytime</li>
                  {videoEnabled && (
                    <li>• Video recording is enabled for this interview</li>
                  )}
                </ul>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Project:</span>
                  <span className="font-medium">{session?.project_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Questions:</span>
                  <span className="font-medium">{session?.total_questions}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Language:</span>
                  <span className="font-medium">
                    {LANGUAGE_OPTIONS.find(l => l.code === selectedLanguage)?.name}
                  </span>
                </div>
                {videoEnabled && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600">Video:</span>
                    <span className="font-medium text-green-600 flex items-center">
                      <Video className="w-4 h-4 mr-1" />
                      Enabled
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={startInterview}
              className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 text-lg font-semibold flex items-center justify-center"
            >
              <Phone className="w-6 h-6 mr-2" />
              Start Interview
            </button>
          </div>
        );
      
      case 'completed':
        return (
          <div className="max-w-md mx-auto py-8 text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Interview Completed!
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for completing the interview, {session?.beneficiary_first_name}. 
              Your responses have been recorded and will help improve our programs.
            </p>
            
            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-green-600">
                    {session?.answered_questions}
                  </div>
                  <div className="text-sm text-gray-600">Questions Answered</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">
                    100%
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
              </div>
            </div>
            
            {!showUploadOptions && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowUploadOptions(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  📤 Upload Options
                </button>
                <p className="text-sm text-gray-500">
                  You can safely close this page now.
                </p>
              </div>
            )}
          </div>
        );
      
      case 'paused':
        return (
          <div className="max-w-md mx-auto py-8 text-center">
            <Pause className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Interview Paused
            </h2>
            <p className="text-gray-600 mb-6">
              Your progress has been saved. You can resume anytime before the link expires.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span>Progress:</span>
                <span className="font-bold">
                  {session?.answered_questions} / {session?.total_questions}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${session?.progress_percentage || 0}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={resumeInterview}
                className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-lg font-semibold"
              >
                Resume Interview
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-base font-medium"
              >
                Restart Interview
              </button>
            </div>
          </div>
        );
      
      default:
        return renderActiveInterview();
    }
  };
  
  const renderActiveInterview = () => (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageCircle className="w-6 h-6 text-blue-500 mr-2" />
            <span className="font-semibold">{session?.project_name}</span>
          </div>
          <div className="flex items-center space-x-2">
            {videoEnabled && videoConsented && (
              <button
                onClick={() => setShowVideoPanel(!showVideoPanel)}
                className={`p-2 rounded-full hover:bg-gray-100 ${showVideoPanel ? 'text-blue-500' : 'text-gray-400'}`}
                title={showVideoPanel ? 'Hide video' : 'Show video'}
              >
                {showVideoPanel ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            {fullRecording && (
              <div className="flex items-center px-2 py-1 bg-red-100 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />
                <span className="text-xs text-red-700">Recording</span>
              </div>
            )}
            <button
              onClick={pauseInterview}
              className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Pause
            </button>
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              Leave
            </button>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{session?.current_section_name || 'Interview'}</span>
            <span>{session?.answered_questions} / {session?.total_questions}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${session?.progress_percentage || 0}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Main content area - with optional video panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${videoEnabled && videoConsented && showVideoPanel ? 'lg:w-2/3' : 'w-full'}`}>
          {conversation.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                <p>{msg.content}</p>
                {msg.audioUrl && msg.role === 'assistant' && (
                  <button
                    onClick={() => {
                      playAudio(msg.audioUrl!).catch(err => {
                        console.warn('Replay audio failed:', err);
                      });
                    }}
                    className="mt-2 text-xs flex items-center opacity-70 hover:opacity-100"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Play again
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {/* Current question hint */}
          {currentQuestion && interviewState === 'listening' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="font-medium text-blue-800 mb-1">Current Question:</div>
              <div className="text-blue-700">{currentQuestion.question_text}</div>
              {currentQuestion.options && currentQuestion.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {currentQuestion.options.map((opt, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-100 rounded text-xs">
                      {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div ref={conversationEndRef} />
        </div>
        
        {/* Video Panel - shown on larger screens when video is enabled */}
        {videoEnabled && videoConsented && showVideoPanel && (
          <div className="hidden lg:block lg:w-1/3 border-l bg-gray-50 p-4">
            <div className="sticky top-4">
              <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                <Video className="w-5 h-5 mr-2" />
                Video Recording
              </h3>
              <VideoCapture
                accessToken={accessToken || ''}
                apiBaseUrl={API_BASE_URL}
                questionId={currentQuestion?.question_id}
                videoType="question_response"
                onVideoUploaded={handleVideoUploaded}
                onConsentChange={handleVideoConsentChange}
                showPreview={true}
                compact={false}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Video capture for mobile - shown above controls */}
      {videoEnabled && videoConsented && showVideoPanel && (
        <div className="lg:hidden border-t bg-gray-50 p-3">
          <VideoCapture
            accessToken={accessToken || ''}
            apiBaseUrl={API_BASE_URL}
            questionId={currentQuestion?.question_id}
            videoType="question_response"
            onVideoUploaded={handleVideoUploaded}
            onConsentChange={handleVideoConsentChange}
            showPreview={true}
            compact={true}
          />
        </div>
      )}
      
      {/* Video consent prompt - shown initially if video is enabled but not consented */}
      {videoEnabled && !videoConsented && interviewState === 'listening' && (
        <div className="border-t bg-gray-50 px-4 py-3">
          <VideoCapture
            accessToken={accessToken || ''}
            apiBaseUrl={API_BASE_URL}
            onConsentChange={handleVideoConsentChange}
            showPreview={false}
          />
        </div>
      )}
      
      {/* Audio Controls */}
      <div className="bg-white border-t px-4 py-4 flex-shrink-0">
        {interviewState === 'processing' && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mr-2" />
            <span className="text-gray-600">Processing your response...</span>
          </div>
        )}
        
        {interviewState === 'speaking' && (
          <div className="flex items-center justify-center py-4">
            <Volume2 className="w-6 h-6 text-blue-500 animate-pulse mr-2" />
            <span className="text-gray-600">AI is speaking...</span>
          </div>
        )}
        
        {interviewState === 'listening' && (
          <div className="flex flex-col items-center">
            {/* Error display */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm max-w-md text-center">
                {error}
                <button 
                  onClick={() => setError('')}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            )}
            
            {/* Text input fallback */}
            {showTextInput && !isRecording && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg max-w-md">
                <p className="text-yellow-800 text-sm mb-3">Audio not working? Type your response:</p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your answer here..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && textInput.trim()) {
                        processTextResponse(textInput.trim());
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (textInput.trim()) {
                        processTextResponse(textInput.trim());
                      }
                    }}
                    disabled={!textInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    Send
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowTextInput(false);
                    setTextInput('');
                  }}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Try voice again
                </button>
              </div>
            )}
            
            {/* Auto-record mode toggle */}
            <div className="mb-4 flex items-center space-x-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRecordMode}
                  onChange={(e) => setAutoRecordMode(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoRecordMode ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    autoRecordMode ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
                <span className="ml-2 text-sm text-gray-600">
                  {autoRecordMode ? 'Auto Recording' : 'Manual Recording'}
                </span>
              </label>
            </div>
            
            {isRecording && (
              <div className="flex items-center mb-3 text-red-500">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2" />
                <span className="font-mono">{formatTime(recordingTime)}</span>
              </div>
            )}
            
            {autoRecordMode ? (
              <div className="flex flex-col items-center">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-red-500 scale-110'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-10 h-10 text-white" />
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}
                </button>
                <p className="mt-3 text-sm text-gray-500 text-center">
                  {isRecording ? 'Click to stop' : 'Click to start'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={isRecording ? stopRecording : undefined}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-red-500 scale-110'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-10 h-10 text-white" />
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}
                </button>
                <p className="mt-3 text-sm text-gray-500 text-center">
                  {isRecording ? 'Release to send' : 'Hold to speak'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      {renderContent()}
      
      {/* Upload Options Modal */}
      {showUploadOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📁 Upload Recording?
            </h3>
            <p className="text-gray-600 mb-6">
              Would you like to upload the interview recording or restart the interview?
            </p>
            <div className="space-y-3">
              {recordedAudio && (
                <button
                  onClick={() => {
                    const formData = new FormData();
                    formData.append('audio', recordedAudio, 'interview_recording.webm');
                    formData.append('video_type', 'full_interview');
                    
                    fetch(`${API_BASE_URL}/api/ai-interviews/public/${accessToken}/upload-video/`, {
                      method: 'POST',
                      body: formData
                    }).then(() => {
                      setShowUploadOptions(false);
                      alert('Recording uploaded successfully!');
                    }).catch(() => {
                      alert('Upload failed. Please try again.');
                    });
                  }}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  📤 Upload Audio Recording
                </button>
              )}
              
              {videoEnabled && (
                <button
                  onClick={() => {
                    alert('Video recording will be available soon!');
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  📹 Upload Video Recording
                </button>
              )}
              
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to restart the interview? All progress will be lost.')) {
                    try {
                      await fetch(`${API_BASE_URL}/api/ai-interviews/public/${accessToken}/reset/`, {
                        method: 'POST'
                      });
                    } catch (err) {
                      console.warn('Reset failed:', err);
                    }
                    window.location.reload();
                  }
                }}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition font-medium"
              >
                🔄 Restart Interview
              </button>
              
              {recordedAudio && (
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(recordedAudio);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `interview_${session?.beneficiary_first_name}_${new Date().toISOString().slice(0,10)}.webm`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setShowUploadOptions(false);
                  }}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition font-medium"
                >
                  💾 Download Only
                </button>
              )}
              
              <button
                onClick={() => setShowUploadOptions(false)}
                className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Video Recording Prompt */}
      {showVideoPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📹 Video Recording Available
            </h3>
            <p className="text-gray-600 mb-6">
              This interview supports video recording. Please enable your camera to record video along with audio for better assessment.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setVideoConsented(true);
                  setShowVideoPrompt(false);
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Enable Video
              </button>
              <button
                onClick={() => setShowVideoPrompt(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition font-medium"
              >
                Audio Only
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Leave Interview?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to leave this interview? Your progress will be saved and you can resume later.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  if (fullRecorder && fullRecording) {
                    fullRecorder.stop();
                    setFullRecording(false);
                  }
                  pauseInterview();
                  navigate('/');
                }}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium"
              >
                Yes, Leave
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIVoiceInterviewPage;