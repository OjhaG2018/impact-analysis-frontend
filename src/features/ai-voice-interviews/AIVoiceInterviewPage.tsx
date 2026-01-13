// frontend/src/pages/AIVoiceInterviewPage.tsx
// FIXED: VAD sensitivity - lowered thresholds and increased audio level multiplier
// FIXED: Start New Session button now calls reset API
// HANDS-FREE AI Interview with Video/Audio Mode, Leave/Stop/Resume Controls

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Play, Pause, Volume2, VolumeX, 
  CheckCircle, AlertCircle, Clock, MessageCircle,
  Phone, Globe, ChevronRight, Loader2, RefreshCw,
  Video, VideoOff, SkipForward, Settings, X,
  Headphones, Camera, AudioLines, PhoneOff, LogOut, ArrowLeft
} from 'lucide-react';

// ============= Type Definitions =============
type TurnState = 'ai' | 'user' | 'processing' | 'waiting';
type InterviewMode = 'video' | 'audio';

interface PublicInterviewSession {
  id: number;
  access_token: string;
  project_name: string;
  questionnaire_name: string;
  beneficiary_name: string;
  beneficiary_first_name: string;
  status: string;
  language: string;
  total_questions: number;
  answered_questions: number;
  progress_percentage: number;
  is_expired: boolean;
  video_capture_enabled?: boolean;
  current_section_name?: string;
}

interface StartInterviewResponse {
  status: string;
  session_info: PublicInterviewSession;
  greeting: string;
  greeting_audio_url?: string;
  next_question: QuestionData | null;
  audio_enabled: boolean;
}

interface QuestionData {
  question_id: number;
  question_text: string;
  question_type: string;
  options: string[];
  section: string;
  is_required?: boolean;
}

interface ProcessAudioResponse {
  transcription: string;
  ai_message: string;
  ai_audio_url?: string;
  progress: {
    answered: number;
    total: number;
    percentage: number;
  };
  next_question: QuestionData | null;
  answer_accepted?: boolean;
  needs_clarification?: boolean;
  transcription_failed?: boolean;
  echo_detected?: boolean;
  message?: string;
  show_text_input?: boolean;
}

interface InterviewCompletionResponse {
  status: 'completed';
  message: string;
  audio_url?: string;
  summary: {
    total_questions: number;
    answered: number;
  };
}

interface ConversationMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  audioUrl?: string;
  timestamp: Date;
}

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

type InterviewState = 
  | 'loading' 
  | 'language_select' 
  | 'ready' 
  | 'mode_select'
  | 'greeting' 
  | 'listening' 
  | 'processing' 
  | 'speaking' 
  | 'paused'
  | 'completed'
  | 'error'
  | 'expired'
  | 'stopped';

import { api, endpoints } from '../../api';
// ============= Format Time Helper =============
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeDetailed = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

// ============= Audio Level Bar Component =============
const AudioLevelBar: React.FC<{ 
  level: number; 
  threshold: number; 
  isActive: boolean;
  audioContextState?: string;
}> = ({ level, threshold, isActive, audioContextState }) => {
  const percentage = Math.min(100, Math.max(0, level));
  const thresholdPercentage = Math.min(100, Math.max(0, threshold));
  const isMicWorking = level > 0.5;
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span className="flex items-center gap-1">
          Mic Level
          {isActive && (
            <span className={`w-2 h-2 rounded-full ${isMicWorking ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          )}
        </span>
        <span className={`font-mono ${level > threshold ? 'text-green-600 font-bold' : ''}`}>
          {Math.round(level)}
        </span>
      </div>
      <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`absolute left-0 top-0 h-full transition-all duration-75 rounded-full ${
            level > threshold 
              ? 'bg-gradient-to-r from-green-400 to-green-500' 
              : level > 0.5 
                ? 'bg-gradient-to-r from-blue-300 to-blue-400'
                : 'bg-gradient-to-r from-gray-300 to-gray-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
        <div 
          className="absolute top-0 h-full w-1 bg-red-500 z-10"
          style={{ left: `${thresholdPercentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs mt-1">
        <span className="text-gray-400">Silent</span>
        {audioContextState && audioContextState !== 'running' && (
          <span className="text-orange-500 text-[10px] font-medium">
            ⚠️ Audio: {audioContextState}
          </span>
        )}
        {!isMicWorking && isActive && audioContextState === 'running' && (
          <span className="text-red-500 text-[10px] font-medium animate-pulse">⚠️ No mic input</span>
        )}
        {isMicWorking && isActive && level <= threshold && (
          <span className="text-blue-500 text-[10px]">Speak louder to start</span>
        )}
        <span className="text-gray-400">Loud</span>
      </div>
    </div>
  );
};

// ============= Animated Waveform Component =============
const AnimatedWaveform: React.FC<{ isActive: boolean; level: number }> = ({ isActive, level }) => {
  const bars = 7;
  
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {Array.from({ length: bars }).map((_, i) => {
        const baseHeight = 8;
        const maxHeight = 40;
        const variance = isActive ? (level / 100) * (maxHeight - baseHeight) : 0;
        const randomOffset = Math.sin(Date.now() / 200 + i * 0.5) * variance * 0.3;
        const height = baseHeight + variance + randomOffset;
        
        return (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-100 ${
              isActive && level > 10
                ? 'bg-gradient-to-t from-green-500 to-green-300'
                : 'bg-gray-300'
            }`}
            style={{
              height: `${Math.max(baseHeight, Math.min(maxHeight, height))}px`,
            }}
          />
        );
      })}
    </div>
  );
};

// ============= Video Preview Component with Recording Time =============
const VideoPreview: React.FC<{ 
  videoRef: React.RefObject<HTMLVideoElement>; 
  isRecording: boolean;
  isVisible: boolean;
  recordingTime: number;
  totalRecordingTime: number;
}> = ({ videoRef, isRecording, isVisible, recordingTime, totalRecordingTime }) => {
  if (!isVisible) return null;
  
  return (
    <div className="relative w-36 h-28 rounded-lg overflow-hidden shadow-lg border-2 border-gray-300">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover transform scale-x-[-1]"
      />
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded-full animate-pulse">
          <span className="w-2 h-2 bg-white rounded-full" />
          <span className="text-[10px] text-white font-bold">{formatTime(recordingTime)}</span>
        </div>
      )}
      
      {/* Total recording time */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Video className="w-3 h-3 text-white" />
            <span className="text-[10px] text-white">You</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-white" />
            <span className="text-[10px] text-white font-mono">{formatTimeDetailed(totalRecordingTime)}</span>
          </div>
        </div>
      </div>
      
      {/* Live indicator when not recording */}
      {!isRecording && (
        <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-green-500 rounded-full">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span className="text-[9px] text-white font-medium">LIVE</span>
        </div>
      )}
    </div>
  );
};

// ============= Turn Indicator Component =============
const TurnIndicator: React.FC<{
  currentTurn: TurnState;
  aiSpeaking: boolean;
  canRecord: boolean;
  isRecording: boolean;
  isListening: boolean;
  audioLevel: number;
  handsFreeMode: boolean;
  voiceThreshold: number;
  interviewMode: InterviewMode;
  onManualStart: () => void;
  onManualStop: () => void;
  onContainerClick?: () => void;
  audioContextState?: string;
}> = ({ 
  currentTurn, aiSpeaking, canRecord, isRecording, isListening, 
  audioLevel, handsFreeMode, voiceThreshold, interviewMode, onManualStart, onManualStop, onContainerClick, audioContextState 
}) => {
  
  const getConfig = () => {
    if (isRecording) {
      return {
        borderColor: 'border-red-500',
        bgColor: 'bg-red-50',
        text: '🔴 Recording',
        subText: handsFreeMode ? 'Pause speaking when done...' : 'Tap to stop',
        showWaveform: true,
        showLevel: true,
      };
    }
    
    if (isListening && !isRecording) {
      return {
        borderColor: 'border-green-500',
        bgColor: 'bg-green-50',
        text: '🎧 Listening',
        subText: 'Start speaking now...',
        showWaveform: true,
        showLevel: true,
      };
    }

    if (aiSpeaking || currentTurn === 'ai') {
      return {
        borderColor: 'border-blue-500',
        bgColor: 'bg-blue-50',
        text: '🔊 AI Speaking',
        subText: 'Please listen...',
        showWaveform: false,
        showLevel: false,
      };
    }

    if (currentTurn === 'processing') {
      return {
        borderColor: 'border-yellow-500',
        bgColor: 'bg-yellow-50',
        text: '⏳ Processing',
        subText: 'Analyzing your response...',
        showWaveform: false,
        showLevel: false,
      };
    }

    if (canRecord || currentTurn === 'user') {
      return {
        borderColor: 'border-green-500',
        bgColor: 'bg-green-50',
        text: '🎤 Your Turn',
        subText: handsFreeMode ? 'Start speaking...' : 'Tap mic to speak',
        showWaveform: false,
        showLevel: true,
      };
    }

    return {
      borderColor: 'border-gray-400',
      bgColor: 'bg-gray-50',
      text: '⏸️ Please wait',
      subText: 'Preparing...',
      showWaveform: false,
      showLevel: false,
    };
  };

  const config = getConfig();

  return (
    <div 
      className={`w-full max-w-sm mx-auto p-3 sm:p-4 rounded-2xl border-2 ${config.borderColor} ${config.bgColor} transition-all duration-300 cursor-pointer`}
      onClick={async () => {
        // Always try to resume AudioContext on any click
        if (onContainerClick) {
          await onContainerClick();
        }
      }}
    >
      {/* Status */}
      <div className="text-center mb-3">
        <p className="font-bold text-gray-800 text-lg sm:text-xl">{config.text}</p>
        <p className="text-xs sm:text-sm text-gray-500">{config.subText}</p>
      </div>
      
      {/* Waveform visualization */}
      {config.showWaveform && (
        <div className="mb-3">
          <AnimatedWaveform isActive={isRecording || isListening} level={audioLevel} />
        </div>
      )}
      
      {/* Audio level bar */}
      {config.showLevel && (
        <div className="mb-3">
          <AudioLevelBar 
            level={audioLevel} 
            threshold={voiceThreshold} 
            isActive={isListening || isRecording} 
            audioContextState={audioContextState}
          />
        </div>
      )}
      
      {/* Manual control buttons */}
      <div className="flex justify-center gap-3">
        {isRecording ? (
          <button
            onClick={onManualStop}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-all shadow-lg text-sm sm:text-base"
          >
            <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Stop Recording</span>
            <span className="sm:hidden">Stop</span>
          </button>
        ) : (isListening || canRecord) ? (
          <button
            onClick={onManualStart}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 transition-all shadow-lg animate-pulse text-sm sm:text-base"
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">{handsFreeMode ? 'Tap to Record' : 'Start Recording'}</span>
            <span className="sm:hidden">Record</span>
          </button>
        ) : null}
      </div>
      
      {/* Mode badges */}
      <div className="flex justify-center gap-2 mt-3">
        {handsFreeMode && (
          <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-purple-100 rounded-full">
            <Headphones className="w-3 h-3 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium">Hands-Free</span>
          </div>
        )}
        <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full ${
          interviewMode === 'video' ? 'bg-blue-100' : 'bg-gray-100'
        }`}>
          {interviewMode === 'video' ? (
            <>
              <Video className="w-3 h-3 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Video</span>
            </>
          ) : (
            <>
              <AudioLines className="w-3 h-3 text-gray-600" />
              <span className="text-xs text-gray-600 font-medium">Audio Only</span>
            </>
          )}
        </div>
      </div>
      
      {/* Audio Context Warning */}
      {audioContextState && audioContextState !== 'running' && (isListening || canRecord) && (
        <div className="mt-3 p-2 bg-orange-100 rounded-lg text-center">
          <p className="text-xs text-orange-700 font-medium">
            ⚠️ Microphone paused ({audioContextState})
          </p>
          <p className="text-xs text-orange-600 mt-1">
            Tap anywhere on this box to enable
          </p>
        </div>
      )}
    </div>
  );
};

// ============= Leave Confirmation Modal =============
const LeaveConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onPause: () => void;
  onStop: () => void;
  totalRecordingTime: number;
  answeredQuestions: number;
  totalQuestions: number;
}> = ({ isOpen, onClose, onPause, onStop, totalRecordingTime, answeredQuestions, totalQuestions }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-4 sm:p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">Leave Interview?</h3>
          <p className="text-gray-500 text-sm mt-1">What would you like to do?</p>
        </div>
        
        {/* Progress Summary */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500 text-xs sm:text-sm">Progress</div>
              <div className="font-bold text-base sm:text-lg">{answeredQuestions}/{totalQuestions}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs sm:text-sm">Total Recording</div>
              <div className="font-bold text-base sm:text-lg">{formatTimeDetailed(totalRecordingTime)}</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Pause Option */}
          <button
            onClick={onPause}
            className="w-full py-2 sm:py-3 px-4 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
            Pause & Save Progress
          </button>
          <p className="text-xs text-gray-500 text-center -mt-1">You can resume later from where you left</p>
          
          {/* Stop Option */}
          <button
            onClick={onStop}
            className="w-full py-2 sm:py-3 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
            Stop Interview
          </button>
          <p className="text-xs text-gray-500 text-center -mt-1">End the interview completely</p>
          
          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full py-2 sm:py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all text-sm sm:text-base"
          >
            Continue Interview
          </button>
        </div>
      </div>
    </div>
  );
};

// ============= Main Component =============
const AIVoiceInterviewPage: React.FC = () => {
  const { accessToken } = useParams<{ accessToken: string }>();
  const navigate = useNavigate();
  
  // Session state
  const [session, setSession] = useState<PublicInterviewSession | null>(null);
  const [interviewState, setInterviewState] = useState<InterviewState>('loading');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [error, setError] = useState<string>('');
  
  // Interview mode (video or audio)
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('audio');
  
  // Turn-taking state
  const [canRecord, setCanRecord] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [turnState, setTurnState] = useState<TurnState>('waiting');
  const [bargeInEnabled, setBargeInEnabled] = useState(true);
  const [turnTransitionDelay, setTurnTransitionDelay] = useState(500);
  
  // ============= FIXED VAD SETTINGS - MORE SENSITIVE + VOLUME BOOST =============
  const [handsFreeMode, setHandsFreeMode] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceThreshold, setSilenceThreshold] = useState(1); // LOWERED from 3 to 1
  const [silenceDuration, setSilenceDuration] = useState(3000); // INCREASED to 3 seconds
  const [minRecordingTime, setMinRecordingTime] = useState(2000); // INCREASED to 2 seconds
  const [voiceDetectionThreshold, setVoiceDetectionThreshold] = useState(2); // LOWERED for better detection
  const [microphoneGain, setMicrophoneGain] = useState(2.5); // NEW: Volume boost
  // ============= END FIXED VAD SETTINGS =============
  
  // Current question state
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [answerAttempts, setAnswerAttempts] = useState(0);
  const [waitingForValidAnswer, setWaitingForValidAnswer] = useState(false);
  const [lastInvalidResponse, setLastInvalidResponse] = useState('');
  const [audioContextState, setAudioContextState] = useState<string>('not created');
  
  // Conversation history
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  
  // Audio/Video state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [totalRecordingTime, setTotalRecordingTime] = useState(0);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  
  // Reset button state for stopped screen
  const [isResetting, setIsResetting] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const turnTransitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null!);
  
  // VAD refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const isListeningRef = useRef(false);
  const interviewStateRef = useRef<InterviewState>('loading');
  const animationFrameRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  
  // Function refs to avoid closure issues
  const startRecordingInternalRef = useRef<(() => void) | null>(null);
  const stopRecordingInternalRef = useRef<(() => void) | null>(null);
  // Add these new refs after existing refs
  const mixedAudioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const aiAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const fullInterviewRecorderRef = useRef<MediaRecorder | null>(null);
  const fullInterviewChunksRef = useRef<Blob[]>([]);
  const isFullInterviewRecordingRef = useRef(false);

  // Auto upload function
  const handleAutoUpload = useCallback(async () => {
    console.log('📤 Starting automatic upload...');
    
    try {
      // Stop and collect full interview recording
      const fullInterviewBlob = await stopFullInterviewRecording();
      
      if (fullInterviewBlob && fullInterviewBlob.size > 1000) {
        console.log(`📤 Uploading ${(fullInterviewBlob.size / 1024 / 1024).toFixed(2)} MB recording...`);
        
        const formData = new FormData();
        const fileName = `interview_${Date.now()}.${interviewMode === 'video' ? 'webm' : 'webm'}`;
        formData.append(interviewMode === 'video' ? 'video' : 'audio', fullInterviewBlob, fileName);
        formData.append('recording_type', 'full_interview');
        formData.append('duration_seconds', String(totalRecordingTime));
        formData.append('mode', interviewMode);
        
        const uploadEndpoint = interviewMode === 'video' 
          ? endpoints.uploadVideo(accessToken!)
          : endpoints.uploadVideo(accessToken!);
        
        const response = await fetch(
          `${api.getBaseUrl()}${uploadEndpoint}`,
          { method: 'POST', body: formData }
        );
        
        if (response.ok) {
          console.log('✅ Auto-upload successful!');
        } else {
          console.error('❌ Auto-upload failed:', response.status);
        }
      } else {
        console.log('ℹ️ No recording to upload');
      }
    } catch (err) {
      console.error('❌ Auto-upload error:', err);
    }
  }, [accessToken, interviewMode, totalRecordingTime]);
  
  // Keep refs in sync
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);
  
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);
  
  useEffect(() => {
    interviewStateRef.current = interviewState;
    console.log('📍 Interview state changed to:', interviewState);
  }, [interviewState]);
  
  // Helper to resume AudioContext (call on any user interaction)
  const resumeAudioContext = useCallback(async () => {
    if (audioContextRef.current) {
      console.log('🔊 User interaction - checking AudioContext state:', audioContextRef.current.state);
      if (audioContextRef.current.state === 'suspended') {
        console.log('🔊 Resuming suspended AudioContext...');
        try {
          await audioContextRef.current.resume();
          console.log('✅ AudioContext resumed:', audioContextRef.current.state);
          setAudioContextState(audioContextRef.current.state);
        } catch (err) {
          console.error('❌ Failed to resume AudioContext:', err);
        }
      }
    }
  }, []);
  
  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [conversation, scrollToBottom]);
  
  // Update turn state
  useEffect(() => {
    if (aiSpeaking) {
      setTurnState('ai');
    } else if (interviewState === 'processing') {
      setTurnState('processing');
    } else if (interviewState === 'listening' && canRecord) {
      setTurnState('user');
    } else {
      setTurnState('waiting');
    }
  }, [aiSpeaking, interviewState, canRecord]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);
  
  // Handle browser back button / page leave
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (['listening', 'speaking', 'processing', 'greeting'].includes(interviewState)) {
        e.preventDefault();
        e.returnValue = 'Interview in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [interviewState]);
  
  const cleanupAudio = useCallback(() => {
    console.log('Cleaning up audio/video resources...');
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (turnTransitionTimerRef.current) clearTimeout(turnTransitionTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  }, []);
  
  // Stop all recordings immediately
  const stopAllRecordings = useCallback(() => {
    console.log('Stopping all recordings...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping audio recorder:', err);
      }
    }
    
    if (videoRecorderRef.current && videoRecorderRef.current.state === 'recording') {
      try {
        videoRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping video recorder:', err);
      }
    }
    
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsListening(false);
    isListeningRef.current = false;
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (audioPlayerRef.current && isPlaying) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlaying(false);
      setAiSpeaking(false);
    }
    
    if (turnTransitionTimerRef.current) {
      clearTimeout(turnTransitionTimerRef.current);
      turnTransitionTimerRef.current = null;
    }
  }, [isPlaying]);
  
  // Load session
  useEffect(() => {
    const loadSession = async () => {
      if (!accessToken) {
        setError('Invalid interview link');
        setInterviewState('error');
        return;
      }
      
      try {
        const response = await fetch(`${api.getBaseUrl()}${endpoints.publicInterview(accessToken)}`);
        
        if (!response.ok) {
          if (response.status === 410) {
            setInterviewState('expired');
            return;
          }
          throw new Error('Failed to load interview');
        }
        
        const data: PublicInterviewSession = await response.json();
        setSession(data);
        
        if (data.is_expired) {
          setInterviewState('expired');
        } else if (data.status === 'completed') {
          setInterviewState('completed');
        } else if (data.status === 'stopped') {
          setInterviewState('stopped');
        } else if (data.status === 'paused' || data.status === 'in_progress') {
          setSelectedLanguage(data.language);
          setInterviewState('ready');
        } else {
          setInterviewState('language_select');
        }
      } catch (err: any) {
        console.error('Error loading session:', err);
        setError(err.message || 'Failed to load interview');
        setInterviewState('error');
      }
    };
    
    loadSession();
  }, [accessToken]);
  
  // ============= FIXED: More sensitive audio level monitoring =============
  const startAudioLevelMonitoring = useCallback(() => {
    console.log('🎙️ Starting audio level monitoring...');
    console.log('AudioContext state:', audioContextRef.current?.state);
    console.log('Analyser ready:', !!analyserRef.current);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    let frameCount = 0;
    
    const updateLevel = async () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        console.log('⚠️ AudioContext suspended, attempting resume...');
        try {
          await audioContextRef.current.resume();
          console.log('✅ AudioContext resumed');
        } catch (err) {
          console.error('Failed to resume AudioContext:', err);
        }
      }
      
      if (!analyserRef.current) {
        console.log('⏳ Analyser not ready, waiting...');
        animationFrameRef.current = requestAnimationFrame(updateLevel);
        return;
      }
      
      // Method 1: Time domain (waveform)
      const bufferLength = analyserRef.current.frequencyBinCount;
      const timeDataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(timeDataArray);
      
      // Method 2: Frequency domain
      const freqDataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(freqDataArray);
      
      // Calculate RMS from time domain - INCREASED SENSITIVITY
      let timeSum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (timeDataArray[i] - 128) / 128;
        timeSum += normalized * normalized;
      }
      const timeRms = Math.sqrt(timeSum / bufferLength);
      const timeLevel = Math.min(100, timeRms * 500); // INCREASED from 300 to 500
      
      // Calculate level from frequency domain - INCREASED SENSITIVITY + VOLUME BOOST
      let freqSum = 0;
      for (let i = 0; i < bufferLength; i++) {
        freqSum += freqDataArray[i];
      }
      const freqLevel = Math.min(100, (freqSum / bufferLength) * 3 * microphoneGain); // BOOSTED with gain
      
      // Use the higher of the two methods with gain boost
      const normalizedLevel = Math.max(timeLevel * microphoneGain, freqLevel);
      
      // Debug logging every 60 frames
      frameCount++;
      if (frameCount % 60 === 0) {
        console.log(`📊 Audio: timeLevel=${timeLevel.toFixed(1)}, freqLevel=${freqLevel.toFixed(1)}, combined=${normalizedLevel.toFixed(1)}, threshold=${voiceDetectionThreshold}`);
        console.log(`   Listening: ${isListeningRef.current}, Recording: ${isRecordingRef.current}`);
      }
      
      setAudioLevel(normalizedLevel);
      
      // Voice Activity Detection - TRIGGER RECORDING
      if (isListeningRef.current && !isRecordingRef.current) {
        if (normalizedLevel > voiceDetectionThreshold) {
          console.log(`🎤 Voice detected! Level: ${normalizedLevel.toFixed(1)}, Threshold: ${voiceDetectionThreshold}`);
          if (startRecordingInternalRef.current) {
            startRecordingInternalRef.current();
          }
        }
      }
      
      // Silence detection during recording
      if (isRecordingRef.current) {
        const recordingDuration = Date.now() - recordingStartTimeRef.current;
        
        if (normalizedLevel < silenceThreshold) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else {
            const silenceTime = Date.now() - silenceStartRef.current;
            if (silenceTime >= silenceDuration && recordingDuration >= minRecordingTime && hasSpokenRef.current) {
              console.log(`🔇 Silence detected for ${silenceTime}ms, stopping recording`);
              if (stopRecordingInternalRef.current) {
                stopRecordingInternalRef.current();
              }
              return;
            }
          }
        } else {
          silenceStartRef.current = null;
          if (normalizedLevel > voiceDetectionThreshold) {
            hasSpokenRef.current = true;
          }
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateLevel);
  }, [voiceDetectionThreshold, silenceThreshold, silenceDuration, minRecordingTime]);
  
  // Initialize audio (and optionally video) - FIXED: Full interview recording
  const initializeMedia = async (mode: InterviewMode) => {
    try {
      console.log(`Initializing media for ${mode} mode...`);
      
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,  // DISABLED for speed
          noiseSuppression: false,  // DISABLED for speed
          autoGainControl: false,   // DISABLED for speed
          sampleRate: 16000,        // REDUCED for speed
          channelCount: 1,          // MONO for speed
          latency: 0.01,           // LOW latency
        }
      });
      
      console.log('Microphone access granted');
      streamRef.current = audioStream;
      setMicPermissionGranted(true);
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({
        sampleRate: 16000,           // REDUCED for speed
        latencyHint: 'interactive'   // LOW latency
      });
      
      console.log('AudioContext state:', audioContextRef.current.state);
      setAudioContextState(audioContextRef.current.state);
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        setAudioContextState(audioContextRef.current.state);
      }
      
      const source = audioContextRef.current.createMediaStreamSource(audioStream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;              // REDUCED for speed
      analyserRef.current.smoothingTimeConstant = 0.1; // FASTER response
      source.connect(analyserRef.current);
      
      // ============= CREATE MIXED AUDIO STREAM FOR FULL INTERVIEW + VOLUME BOOST =============
      mixedAudioDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
      
      // Connect user's microphone to the mixed destination with volume boost
      const micSource = audioContextRef.current.createMediaStreamSource(audioStream);
      
      // Create gain node for volume boost
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = microphoneGain; // Apply volume boost
      
      // Connect: mic -> gain -> destination
      micSource.connect(gainNode);
      gainNode.connect(mixedAudioDestinationRef.current);
      
      console.log(`✅ Mixed audio destination created with ${microphoneGain}x volume boost`);
      
      // Store gain node reference for later adjustment
      (window as any).micGainNode = gainNode;
      
      // Create audio recorder for individual responses - OPTIMIZED for speed
      const audioMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      
      const audioRecorder = new MediaRecorder(audioStream, { 
        mimeType: audioMimeType,
        audioBitsPerSecond: 32000  // REDUCED bitrate for speed
      });
      audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      audioRecorder.onstop = async () => {
        console.log('🎤 Audio recorder stopped, processing...');
        console.log('📍 Current interviewStateRef:', interviewStateRef.current);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: audioMimeType });
        audioChunksRef.current = [];
        
        // ⚠️ USE REF instead of state to avoid stale closure!
        const currentState = interviewStateRef.current;
        const validStates = ['listening', 'processing', 'speaking', 'greeting'];
        
        console.log(`📍 State check: "${currentState}" in [${validStates.join(', ')}]`);
        console.log(`📍 Blob size: ${audioBlob.size}, hasSpoken: ${hasSpokenRef.current}`);
        
        if (validStates.includes(currentState)) {
          if (audioBlob.size > 1000 && hasSpokenRef.current) {
            console.log('✅ Calling processAudioResponse...');
            await processAudioResponse(audioBlob, null);
          } else {
            console.log('⚠️ Recording too short or no speech detected');
            setError('No speech detected. Please try again.');
            setTimeout(() => setError(''), 3000);
            setInterviewState('listening');
            setCanRecord(true);
            setTurnState('user');
            if (handsFreeMode) {
              setTimeout(() => startListening(), 500);
            }
          }
        } else {
          console.log(`⚠️ Skipping process - invalid state: "${currentState}"`);
        }
      };
      
      mediaRecorderRef.current = audioRecorder;
      
      // ============= CREATE FULL INTERVIEW RECORDER =============
      let fullInterviewStream: MediaStream;
      
      if (mode === 'video') {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
          });
          
          videoStreamRef.current = videoStream;
          setCameraPermissionGranted(true);
          
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = videoStream;
          }
          
          // Combined stream: video + mixed audio (user + AI)
          fullInterviewStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...mixedAudioDestinationRef.current.stream.getAudioTracks()
          ]);
          
        } catch (videoErr) {
          console.error('Camera access error:', videoErr);
          setError('Camera access denied. Continuing with audio only.');
          setInterviewMode('audio');
          fullInterviewStream = mixedAudioDestinationRef.current.stream;
        }
      } else {
        // Audio only mode - just mixed audio
        fullInterviewStream = mixedAudioDestinationRef.current.stream;
      }
      
      // Create full interview recorder
      const fullMimeType = mode === 'video' 
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm')
        : audioMimeType;
      
      const fullInterviewRecorder = new MediaRecorder(fullInterviewStream, { mimeType: fullMimeType });
      
      fullInterviewRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          fullInterviewChunksRef.current.push(event.data);
        }
      };
      
      fullInterviewRecorderRef.current = fullInterviewRecorder;
      console.log('✅ Full interview recorder created');
      
      startAudioLevelMonitoring();
      return true;
      
    } catch (err: any) {
      console.error('Media access error:', err);
      setError('Microphone access denied. Please allow microphone access and refresh.');
      setMicPermissionGranted(false);
      return false;
    }
  };
  

  // Start full interview recording when interview starts
  const startFullInterviewRecording = useCallback(() => {
    if (!fullInterviewRecorderRef.current || isFullInterviewRecordingRef.current) {
      console.log('⚠️ Full interview recorder not ready or already recording');
      return;
    }
    
    console.log('🎬 Starting full interview recording (AI + User audio)...');
    fullInterviewChunksRef.current = [];
    
    try {
      fullInterviewRecorderRef.current.start(1000); // Chunk every 1 second
      isFullInterviewRecordingRef.current = true;
      console.log('✅ Full interview recording started');
    } catch (err) {
      console.error('❌ Failed to start full interview recording:', err);
    }
  }, []);
  
  // Stop full interview recording and upload
  const stopFullInterviewRecording = useCallback(async (): Promise<Blob | null> => {
    if (!fullInterviewRecorderRef.current || !isFullInterviewRecordingRef.current) {
      console.log('ℹ️ Full interview recorder not active');
      return null;
    }
    
    return new Promise((resolve) => {
      console.log('🛑 Stopping full interview recording...');
      
      fullInterviewRecorderRef.current!.onstop = () => {
        if (fullInterviewChunksRef.current.length > 0) {
          const mimeType = interviewMode === 'video' ? 'video/webm' : 'audio/webm';
          const blob = new Blob(fullInterviewChunksRef.current, { type: mimeType });
          console.log(`📹 Full interview blob: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
          resolve(blob);
        } else {
          resolve(null);
        }
        isFullInterviewRecordingRef.current = false;
      };
      
      try {
        fullInterviewRecorderRef.current!.stop();
      } catch (err) {
        console.error('Error stopping full interview recorder:', err);
        resolve(null);
      }
    });
  }, [interviewMode]);


  // Start VAD listening
  const startListening = useCallback(async () => {
    console.log('🎧 Attempting to start VAD listening...');
    console.log('   Analyser ready:', !!analyserRef.current);
    console.log('   AudioContext state:', audioContextRef.current?.state);
    
    if (!analyserRef.current) {
      console.warn('❌ Analyser not ready, cannot start listening');
      return;
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      console.log('⚠️ AudioContext suspended, attempting resume...');
      try {
        await audioContextRef.current.resume();
        console.log('✅ AudioContext resumed:', audioContextRef.current.state);
        setAudioContextState(audioContextRef.current.state);
      } catch (err) {
        console.error('❌ Failed to resume AudioContext:', err);
      }
    }
    
    console.log('🎧 VAD listening started');
    setIsListening(true);
    isListeningRef.current = true;
    hasSpokenRef.current = false;
    silenceStartRef.current = null;
  }, []);
  
  // Stop listening
  const stopListening = useCallback(() => {
    console.log('Stopping VAD listening');
    setIsListening(false);
    isListeningRef.current = false;
  }, []);
  
  // Start recording (internal)
// Start recording (internal) - AUDIO ONLY, video records continuously
  const startRecordingInternal = useCallback(() => {
    if (!mediaRecorderRef.current || isRecordingRef.current) {
      console.warn('Cannot start recording');
      return;
    }
    
    console.log('Starting audio recording...');
    audioChunksRef.current = [];
    // REMOVED: videoChunksRef.current = []; - Don't clear video chunks!
    silenceStartRef.current = null;
    hasSpokenRef.current = true;
    
    try {
      mediaRecorderRef.current.start(100);
      
      // REMOVED: Don't start video here - it's already recording continuously
      // if (interviewMode === 'video' && videoRecorderRef.current) {
      //   videoRecorderRef.current.start(100);
      // }
      
      setIsRecording(true);
      isRecordingRef.current = true;
      setIsListening(false);
      isListeningRef.current = false;
      recordingStartTimeRef.current = Date.now();
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        setTotalRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording. Please try again.');
    }
  }, []); // REMOVED interviewMode dependency
    // Stop recording (internal)


  const stopRecordingInternal = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecordingRef.current) return;
    
    console.log('Stopping audio recording...');
    
    try {
      // REMOVED: Don't stop video here - keep it running continuously
      // if (interviewMode === 'video' && videoRecorderRef.current && videoRecorderRef.current.state === 'recording') {
      //   videoRecorderRef.current.stop();
      // }
      
      mediaRecorderRef.current.stop();
      
      setIsRecording(false);
      isRecordingRef.current = false;
      setInterviewState('processing');
      setTurnState('processing');
      setCanRecord(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  }, []); // REMOVED interviewMode dependency

  // Keep function refs in sync
  useEffect(() => {
    startRecordingInternalRef.current = startRecordingInternal;
  }, [startRecordingInternal]);
  
  useEffect(() => {
    stopRecordingInternalRef.current = stopRecordingInternal;
  }, [stopRecordingInternal]);
  
  // Manual start recording
  const manualStartRecording = useCallback(async () => {
    console.log('📱 Manual start recording triggered');
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      console.log('⚠️ Resuming suspended AudioContext...');
      try {
        await audioContextRef.current.resume();
        console.log('✅ AudioContext resumed:', audioContextRef.current.state);
        setAudioContextState(audioContextRef.current.state);
      } catch (err) {
        console.error('Failed to resume AudioContext:', err);
      }
    }
    
    if (aiSpeaking && bargeInEnabled) {
      handleBargeIn();
    } else if (aiSpeaking && !bargeInEnabled) {
      setError('Please wait for AI to finish speaking');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    stopListening();
    startRecordingInternal();
  }, [aiSpeaking, bargeInEnabled, stopListening, startRecordingInternal]);
  
  // Manual stop recording
  const manualStopRecording = useCallback(() => {
    hasSpokenRef.current = true;
    stopRecordingInternal();
  }, [stopRecordingInternal]);
  
  // Handle barge-in
  const handleBargeIn = useCallback(() => {
    if (audioPlayerRef.current && isPlaying) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlaying(false);
      setAiSpeaking(false);
      setInterviewState('listening');
      setCanRecord(true);
      setTurnState('user');
      
      if (turnTransitionTimerRef.current) {
        clearTimeout(turnTransitionTimerRef.current);
      }
      
      if (handsFreeMode) {
        setTimeout(() => startListening(), 300);
      }
    }
  }, [isPlaying, handsFreeMode, startListening]);
  
  // Play AI audio

  // Play AI audio - FIXED: Connect AI audio to mixed stream for full recording
  const playAudio = useCallback((url: string): Promise<void> => {
    return new Promise((resolve) => {
      console.log('🔊 playAudio called with URL:', url);
      
      stopListening();
      
      setInterviewState('speaking');
      setIsPlaying(true);
      setAiSpeaking(true);
      setCanRecord(false);
      setTurnState('ai');
      
      if (turnTransitionTimerRef.current) {
        clearTimeout(turnTransitionTimerRef.current);
        turnTransitionTimerRef.current = null;
      }
      
      const continueAfterAudio = () => {
        console.log('✅ AI audio ended, transitioning to user turn');
        setIsPlaying(false);
        setAiSpeaking(false);
        setInterviewState('listening');
        setCanRecord(true);
        setTurnState('user');
        
        if (handsFreeMode) {
          turnTransitionTimerRef.current = setTimeout(() => {
            console.log('🎧 Auto-starting listening after AI finished');
            startListening();
          }, turnTransitionDelay);
        }
        
        resolve();
      };
      
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.muted = isMuted;
      audio.crossOrigin = "anonymous";
      
      // ============= CONNECT AI AUDIO TO MIXED STREAM =============
      if (audioContextRef.current && mixedAudioDestinationRef.current) {
        try {
          // Disconnect previous AI audio source if exists
          if (aiAudioSourceRef.current) {
            aiAudioSourceRef.current.disconnect();
          }
          
          // Create audio source from AI audio element
          aiAudioSourceRef.current = audioContextRef.current.createMediaElementSource(audio);
          
          // Connect AI audio to mixed destination (for full interview recording)
          aiAudioSourceRef.current.connect(mixedAudioDestinationRef.current);
          
          // Also connect to speakers so user can hear
          aiAudioSourceRef.current.connect(audioContextRef.current.destination);
          
          console.log('✅ AI audio connected to mixed stream');
        } catch (err) {
          console.warn('Failed to connect AI audio to mixed stream:', err);
        }
      }
      
      audio.onended = () => {
        console.log('🔊 Audio ended naturally');
        continueAfterAudio();
      };
      
      audio.onerror = (e) => {
        console.error('❌ Audio error:', e);
        continueAfterAudio();
      };
      
      // NO TIMEOUT - Let audio play completely
      // const timeoutFallback = setTimeout(() => {
      //   console.log('⏰ Audio timeout fallback triggered');
      //   if (audio && !audio.ended) {
      //     audio.pause();
      //   }
      //   continueAfterAudio();
      // }, 30000);
      
      // audio.addEventListener('ended', () => clearTimeout(timeoutFallback));
      // audio.addEventListener('error', () => clearTimeout(timeoutFallback));
      
      // FIXED: Better autoplay handling
      audio.play().then(() => {
        console.log('🔊 AI audio started playing successfully');
      }).catch((err) => {
        console.error('❌ Audio play() failed:', err);
        
        // Show user prompt for audio permission
        if (err.name === 'NotAllowedError') {
          const enableBtn = document.createElement('button');
          enableBtn.textContent = '🔊 Enable AI Voice';
          enableBtn.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: #3b82f6; color: white; border: none;
            padding: 12px 20px; border-radius: 8px; cursor: pointer;
            font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          `;
          
          enableBtn.onclick = async () => {
            try {
              // Resume AudioContext if needed
              if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
              }
              
              await audio.play();
              enableBtn.remove();
              console.log('✅ Audio enabled via user click');
            } catch (retryErr) {
              console.error('❌ Retry failed:', retryErr);
              enableBtn.remove();
              continueAfterAudio();
            }
          };
          
          document.body.appendChild(enableBtn);
        } else {
          continueAfterAudio();
        }
      });
    });
  }, [isMuted, turnTransitionDelay, handsFreeMode, startListening, stopListening]);



  // Handle mode selection and start interview


  const handleModeSelect = async (mode: InterviewMode) => {
    setInterviewMode(mode);
    setInterviewState('greeting');
    setCanRecord(false);
    setTurnState('waiting');
    setTotalRecordingTime(0);
    
    try {
      const mediaReady = await initializeMedia(mode);
      if (!mediaReady) {
        setInterviewState('error');
        return;
      }
      
      // START FULL INTERVIEW RECORDING HERE
      startFullInterviewRecording();
      
      await startInterviewAPI();
      
    } catch (err: any) {
      console.error('Error starting interview:', err);
      setError(err.message || 'Failed to start interview');
      setInterviewState('error');
    }
  };
    

  // Start interview API call
  const startInterviewAPI = async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch(
        `${api.getBaseUrl()}${endpoints.startInterview(accessToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            language: selectedLanguage,
            interview_mode: interviewMode,
            device_info: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
            }
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to start interview');
      
      const data: StartInterviewResponse = await response.json();
      
      setSession(data.session_info);
      setCurrentQuestion(data.next_question);
      
      const greetingMsg: ConversationMessage = {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: data.greeting,
        audioUrl: data.greeting_audio_url,
        timestamp: new Date(),
      };
      setConversation([greetingMsg]);
      
      if (data.greeting_audio_url) {
        try {
          console.log('🔊 Playing greeting audio...');
          await playAudio(data.greeting_audio_url);
          console.log('✅ Greeting finished, ready for user input');
        } catch (err) {
          console.warn('Greeting audio failed:', err);
          setCanRecord(true);
          setTurnState('user');
          setInterviewState('listening');
          if (handsFreeMode) {
            setTimeout(() => startListening(), 500);
          }
        }
      } else {
        console.log('💬 No greeting audio, immediately ready for user input');
        setCanRecord(true);
        setTurnState('user');
        setInterviewState('listening');
        if (handsFreeMode) {
          setTimeout(() => startListening(), 500);
        }
      }
      
    } catch (err: any) {
      console.error('Error starting interview:', err);
      setError(err.message || 'Failed to start interview');
      setInterviewState('error');
    }
  };
  
  // Process audio response
  const processAudioResponse = async (audioBlob: Blob, videoBlob: Blob | null) => {
    if (!accessToken) return;
    
    stopListening();
    
    try {
      const userMsg: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: '🎤 Processing...',
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, userMsg]);
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      if (videoBlob) {
        formData.append('video', videoBlob, 'recording.webm');
      }
      
      const response = await fetch(
        `${api.getBaseUrl()}${endpoints.processAudio(accessToken)}`,
        { method: 'POST', body: formData }
      );
      
      if (!response.ok) throw new Error('Failed to process audio');
      
      const data: ProcessAudioResponse | InterviewCompletionResponse = await response.json();
      
      if ('transcription_failed' in data && data.transcription_failed) {
        setConversation(prev => prev.filter(m => m.id !== userMsg.id));
        setError('Could not understand audio. Please try again.');
        setShowTextInput(true);
        setCanRecord(true);
        setTurnState('user');
        setInterviewState('listening');
        return;
      }
      
      if ('echo_detected' in data && data.echo_detected) {
        setConversation(prev => prev.filter(m => m.id !== userMsg.id));
        setError('Echo detected. Please wait for AI to finish.');
        setCanRecord(true);
        setTurnState('user');
        setInterviewState('listening');
        setTimeout(() => setError(''), 4000);
        if (handsFreeMode) setTimeout(() => startListening(), 1000);
        return;
      }
      
      setConversation(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(m => m.id === userMsg.id);
        if (idx !== -1 && 'transcription' in data) {
          updated[idx].content = data.transcription;
        }
        return updated;
      });
      
      if ('status' in data && data.status === 'completed') {
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
            // AUTO UPLOAD after AI finishes saying thank you
            console.log('🎬 Interview completed, starting auto-upload...');
            await handleAutoUpload();
          } catch (err) {
            console.warn('Completion audio failed:', err);
            await handleAutoUpload(); // Upload even if audio fails
          }
        } else {
          await handleAutoUpload();
        }
        
        setInterviewState('completed');
        setCanRecord(false);
        cleanupAudio();
      } else {
        const processData = data as ProcessAudioResponse;
        
        if (processData.answer_accepted === false || processData.needs_clarification) {
          setAnswerAttempts(prev => prev + 1);
          setWaitingForValidAnswer(true);
          setLastInvalidResponse(processData.transcription || '');
        } else {
          setAnswerAttempts(0);
          setWaitingForValidAnswer(false);
          setLastInvalidResponse('');
          
          if (session) {
            setSession({
              ...session,
              answered_questions: processData.progress.answered,
              progress_percentage: processData.progress.percentage,
            });
          }
          
          if (processData.next_question) {
            setCurrentQuestion(processData.next_question);
          }
        }
        
        const aiMsg: ConversationMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: processData.ai_message,
          audioUrl: processData.ai_audio_url,
          timestamp: new Date(),
        };
        setConversation(prev => [...prev, aiMsg]);
        
        if (processData.ai_audio_url) {
          try {
            console.log('🔊 Playing AI response audio...');
            await playAudio(processData.ai_audio_url);
            console.log('✅ AI audio finished, ready for next user input');
          } catch (err) {
            console.warn('AI audio failed:', err);
            // Ensure we still transition to user turn even if audio fails
            setCanRecord(true);
            setTurnState('user');
            setInterviewState('listening');
            if (handsFreeMode) {
              setTimeout(() => startListening(), 500);
            }
          }
        } else {
          console.log('💬 No AI audio, immediately transitioning to user turn');
          setCanRecord(true);
          setTurnState('user');
          setInterviewState('listening');
          if (handsFreeMode) {
            setTimeout(() => startListening(), 500);
          }
        }
      }
    } catch (err: any) {
      console.error('Error processing audio:', err);
      setError('Failed to process. Please try again.');
      setShowTextInput(true);
      setCanRecord(true);
      setTurnState('user');
      setInterviewState('listening');
    }
  };
  
  // Process text response
  const processTextResponse = async (text: string) => {
    if (!accessToken || !text.trim()) return;
    
    setInterviewState('processing');
    setTurnState('processing');
    setShowTextInput(false);
    setTextInput('');
    setCanRecord(false);
    
    const userMsg: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setConversation(prev => [...prev, userMsg]);
    
    try {
      const response = await fetch(
        `${api.getBaseUrl()}${endpoints.processText(accessToken)}`,
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
        cleanupAudio();
      } else {
        const aiMsg: ConversationMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.ai_message,
          audioUrl: data.ai_audio_url,
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
        
        if (data.next_question) setCurrentQuestion(data.next_question);
        
        if (data.ai_audio_url) {
          try {
            console.log('🔊 Playing AI response audio (text response)...');
            await playAudio(data.ai_audio_url);
            console.log('✅ AI audio finished, ready for next user input');
          } catch (err) {
            console.warn('AI audio failed:', err);
            setCanRecord(true);
            setTurnState('user');
            setInterviewState('listening');
            if (handsFreeMode) {
              setTimeout(() => startListening(), 500);
            }
          }
        } else {
          console.log('💬 No AI audio, immediately transitioning to user turn');
          setCanRecord(true);
          setTurnState('user');
          setInterviewState('listening');
          if (handsFreeMode) {
            setTimeout(() => startListening(), 500);
          }
        }
      }
    } catch (err) {
      console.error('Error processing text:', err);
      setError('Failed to process. Please try again.');
      setCanRecord(true);
      setTurnState('user');
      setInterviewState('listening');
    }
  };
  
  // PAUSE Interview
  const pauseInterview = async () => {
    if (!accessToken) return;
    
    console.log('Pausing interview...');
    stopAllRecordings();
    
    try {
      await fetch(`${api.getBaseUrl()}${endpoints.pauseInterview(accessToken)}`, { method: 'POST' });
      setInterviewState('paused');
      setCanRecord(false);
      setShowLeaveConfirm(false);
    } catch (err) {
      console.error('Error pausing:', err);
      setError('Failed to pause interview');
    }
  };
  
   /**
   * Collect video blob from MediaRecorder
   */
  const collectVideoBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRecorderRef.current || videoRecorderRef.current.state === 'inactive') {
        if (videoChunksRef.current.length > 0) {
          const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          console.log(`📹 Video blob from chunks: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
          resolve(blob);
        } else {
          resolve(null);
        }
        return;
      }

      videoRecorderRef.current.onstop = () => {
        if (videoChunksRef.current.length > 0) {
          const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          console.log(`📹 Video blob collected: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
          resolve(blob);
        } else {
          resolve(null);
        }
      };

      try {
        videoRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping video recorder:', err);
        if (videoChunksRef.current.length > 0) {
          resolve(new Blob(videoChunksRef.current, { type: 'video/webm' }));
        } else {
          resolve(null);
        }
      }
    });
  };

  /**
   * Upload video blob to server
   */
  const uploadVideoBlob = async (videoBlob: Blob): Promise<boolean> => {
    if (!accessToken || !videoBlob || videoBlob.size === 0) {
      console.log('⚠️ No video to upload');
      return false;
    }

    try {
      const formData = new FormData();
      formData.append('video', videoBlob, `interview_${Date.now()}.webm`);
      formData.append('video_type', 'full_interview');
      formData.append('duration_seconds', String(totalRecordingTime));

      console.log(`📤 Uploading video: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);

      const response = await fetch(
        `${api.getBaseUrl()}${endpoints.uploadVideo(accessToken)}`,
        { method: 'POST', body: formData }
      );

      if (response.ok) {
        console.log('✅ Video uploaded successfully');
        return true;
      } else {
        console.error('❌ Video upload failed:', response.status);
        return false;
      }
    } catch (err) {
      console.error('❌ Video upload error:', err);
      return false;
    }
  };

  // STOP Interview - FIXED: uploads full interview recording
  const stopInterview = async () => {
    if (!accessToken) return;
    
    console.log('🛑 Stopping interview...');
    
    setShowLeaveConfirm(false);
    setInterviewState('processing');
    setCanRecord(false);
    
    // Stop playing audio
    if (audioPlayerRef.current && isPlaying) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlaying(false);
      setAiSpeaking(false);
    }
    
    // Stop listening
    setIsListening(false);
    isListeningRef.current = false;
    
    // Stop timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    try {
      // Stop individual audio recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        console.log('🎤 Stopping individual audio recorder...');
        setIsRecording(false);
        isRecordingRef.current = false;
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.warn('Audio stop error:', err);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Stop and collect full interview recording
      console.log('📹 Collecting full interview recording...');
      const fullInterviewBlob = await stopFullInterviewRecording();
      
      if (fullInterviewBlob && fullInterviewBlob.size > 1000) {
        console.log(`📹 Full interview size: ${(fullInterviewBlob.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Upload full interview
        try {
          const formData = new FormData();
          const fileName = `full_interview_${Date.now()}.${interviewMode === 'video' ? 'webm' : 'webm'}`;
          formData.append(interviewMode === 'video' ? 'video' : 'audio', fullInterviewBlob, fileName);
          formData.append('recording_type', 'full_interview');
          formData.append('duration_seconds', String(totalRecordingTime));
          formData.append('mode', interviewMode);
          
          console.log(`📤 Uploading full interview: ${(fullInterviewBlob.size / 1024 / 1024).toFixed(2)} MB`);
          
          const uploadEndpoint = interviewMode === 'video' 
            ? endpoints.uploadVideo(accessToken)
            : endpoints.uploadVideo(accessToken); // Use video endpoint for both
          
          const response = await fetch(
            `${api.getBaseUrl()}${uploadEndpoint}`,
            { method: 'POST', body: formData }
          );
          
          if (response.ok) {
            console.log('✅ Full interview uploaded successfully');
          } else {
            console.error('❌ Full interview upload failed:', response.status);
          }
        } catch (uploadErr) {
          console.error('❌ Full interview upload error:', uploadErr);
        }
      } else {
        console.log('ℹ️ No full interview recording to upload');
      }
      
      // Call stop API AFTER upload
      console.log('📡 Calling stop API...');
      const response = await fetch(
        `${api.getBaseUrl()}${endpoints.stopInterview(accessToken)}`, 
        { method: 'POST' }
      );
      
      if (response.ok) {
        console.log('✅ Interview stopped');
      }
      
      setInterviewState('stopped');
      cleanupAudio();
      
    } catch (err) {
      console.error('❌ Error stopping:', err);
      setInterviewState('stopped');
      cleanupAudio();
    }
  };


  // RESUME Interview
  const resumeInterview = async () => {
    if (!accessToken) return;
    
    console.log('Resuming interview...');
    
    try {
      if (!streamRef.current || streamRef.current.getTracks().every(t => t.readyState === 'ended')) {
        console.log('Re-initializing media...');
        const mediaReady = await initializeMedia(interviewMode);
        if (!mediaReady) {
          setError('Failed to restart media. Please refresh.');
          return;
        }
      }
      
      const response = await fetch(
        `${api.getBaseUrl()}${endpoints.resumeInterview(accessToken)}`,
        { method: 'POST' }
      );
      const data = await response.json();
      
      setInterviewState('listening');
      setCanRecord(true);
      setTurnState('user');
      if (data.current_question) setCurrentQuestion(data.current_question);
      
      if (handsFreeMode) {
        console.log('Auto-starting listening after resume...');
        setTimeout(() => startListening(), 500);
      }
      
    } catch (err) {
      console.error('Error resuming:', err);
      setError('Failed to resume. Please try again.');
    }
  };
  
  const handleLeaveClick = () => {
    setShowLeaveConfirm(true);
  };
  
  // ============= FIXED: Start New Session handler =============
  const handleStartNewSession = async () => {
    if (!accessToken) return;
    
    setIsResetting(true);
    setError('');
    
    try {
      // Call the reset endpoint to clear the session
      const response = await fetch(
        `${api.getBaseUrl()}${endpoints.resetInterview(accessToken)}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        // Reset local state
        setConversation([]);
        setCurrentQuestion(null);
        setTotalRecordingTime(0);
        setRecordingTime(0);
        setAnswerAttempts(0);
        setWaitingForValidAnswer(false);
        
        // Reload session data
        const sessionResponse = await fetch(`${api.getBaseUrl()}${endpoints.publicInterview(accessToken)}`);
        if (sessionResponse.ok) {
          const data = await sessionResponse.json();
          setSession(data);
        }
        
        // Go back to language selection
        setInterviewState('language_select');
      } else {
        // If reset fails, try reloading
        console.error('Reset failed, reloading page');
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to reset session:', err);
      // Fallback to reload
      window.location.reload();
    } finally {
      setIsResetting(false);
    }
  };

  // ============= Render Functions =============
  
  const renderModeSelect = () => (
    <div className="max-w-md mx-auto py-4 sm:py-8 px-4">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          <Phone className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Choose Interview Mode</h2>
        <p className="text-sm sm:text-base text-gray-600">How would you like to participate?</p>
      </div>
      
      <div className="space-y-3 sm:space-y-4">
        <button
          onClick={() => handleModeSelect('video')}
          className="w-full p-4 sm:p-6 bg-white border-2 border-blue-200 rounded-xl sm:rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-all flex-shrink-0">
              <Video className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <div className="ml-3 sm:ml-4 text-left flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-800">📹 Video + Audio</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Camera will record your responses</p>
              <div className="flex items-center mt-1 sm:mt-2 text-xs text-blue-600">
                <Camera className="w-3 h-3 mr-1 flex-shrink-0" />
                <span>Requires camera permission</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-blue-500 transition-all flex-shrink-0" />
          </div>
        </button>
        
        <button
          onClick={() => handleModeSelect('audio')}
          className="w-full p-4 sm:p-6 bg-white border-2 border-green-200 rounded-xl sm:rounded-2xl hover:border-green-500 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-all flex-shrink-0">
              <AudioLines className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            </div>
            <div className="ml-3 sm:ml-4 text-left flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-800">🎤 Audio Only</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Voice recording only, no video</p>
              <div className="flex items-center mt-1 sm:mt-2 text-xs text-green-600">
                <Mic className="w-3 h-3 mr-1 flex-shrink-0" />
                <span>Requires microphone permission</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-green-500 transition-all flex-shrink-0" />
          </div>
        </button>
      </div>
      
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs sm:text-sm text-yellow-800">
          <strong>💡 Tip:</strong> Video mode helps us better understand your responses and provides a more personal experience.
        </p>
      </div>
      
      <button
        onClick={() => setInterviewState('ready')}
        className="w-full mt-3 sm:mt-4 py-2 text-gray-500 text-xs sm:text-sm hover:text-gray-700"
      >
        ← Back to settings
      </button>
    </div>
  );
  
  // ============= FIXED: renderStopped with working reset button =============
  const renderStopped = () => (
    <div className="max-w-md mx-auto py-4 sm:py-8 px-4 text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-red-100 rounded-full flex items-center justify-center">
        <PhoneOff className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Interview Stopped</h2>
      <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">The interview has been ended.</p>
      
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <div className="text-xl sm:text-2xl font-bold text-gray-700">{session?.answered_questions || 0}</div>
            <div className="text-xs sm:text-sm text-gray-500">Questions Answered</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-gray-700">{formatTimeDetailed(totalRecordingTime)}</div>
            <div className="text-xs sm:text-sm text-gray-500">Total Recording</div>
          </div>
        </div>
      </div>
      
      <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">Your responses have been saved. Thank you for your participation.</p>
      
      {error && (
        <div className="mb-3 sm:mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-xs sm:text-sm">
          {error}
        </div>
      )}
      
      <button
        onClick={handleStartNewSession}
        disabled={isResetting}
        className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto gap-2 text-sm sm:text-base"
      >
        {isResetting ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            <span className="hidden sm:inline">Resetting...</span>
            <span className="sm:hidden">Reset...</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Start New Session</span>
            <span className="sm:hidden">New Session</span>
          </>
        )}
      </button>
    </div>
  );
  
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
          <div className="text-center py-12 px-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Link Expired</h2>
            <p className="text-gray-600 mb-6">Please contact for a new link.</p>
            <button onClick={() => navigate('/')} className="px-6 py-3 bg-blue-600 text-white rounded-lg">
              Go Home
            </button>
          </div>
        );
      
      case 'error':
        return (
          <div className="text-center py-12 px-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center mx-auto">
              <RefreshCw className="w-5 h-5 mr-2" />
              Refresh
            </button>
          </div>
        );
      
      case 'stopped':
        return renderStopped();
      
      case 'language_select':
        return (
          <div className="max-w-md mx-auto py-4 sm:py-8 px-4">
            <div className="text-center mb-6 sm:mb-8">
              <Globe className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2">
                Welcome, {session?.beneficiary_first_name || session?.beneficiary_name?.split(' ')[0]}!
              </h2>
              <p className="text-sm sm:text-base text-gray-600">Select your preferred language.</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-64 overflow-y-auto">
                {LANGUAGE_OPTIONS.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`p-2 sm:p-3 rounded-lg border-2 text-left transition-all ${
                      selectedLanguage === lang.code
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm sm:text-base">{lang.nativeName}</div>
                    <div className="text-xs sm:text-sm text-gray-500">{lang.name}</div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setInterviewState('ready')}
                className="w-full mt-4 sm:mt-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm sm:text-base"
              >
                Continue <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </button>
            </div>
          </div>
        );
      
      case 'ready':
        return (
          <div className="max-w-md mx-auto py-4 sm:py-8 px-4">
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Headphones className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Hands-Free Interview</h2>
              <p className="text-sm sm:text-base text-gray-600">Just speak naturally!</p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <h3 className="font-semibold text-green-800 mb-2 text-sm sm:text-base">✨ How it works:</h3>
              <ol className="text-xs sm:text-sm text-green-700 space-y-1">
                <li>1. Choose video or audio mode</li>
                <li>2. AI asks a question</li>
                <li>3. <strong>Just start speaking</strong> - recording auto-starts</li>
                <li>4. <strong>Pause when done</strong> - recording auto-stops</li>
              </ol>
            </div>
            
            <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <Headphones className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-500 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base truncate">Hands-Free Mode</span>
                </div>
                <button
                  onClick={() => setHandsFreeMode(!handsFreeMode)}
                  className={`relative w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-colors flex-shrink-0 ${handsFreeMode ? 'bg-purple-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow transition-transform ${handsFreeMode ? 'translate-x-6 sm:translate-x-7' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {handsFreeMode ? 'Voice detection enabled' : 'Manual recording mode'}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="text-gray-600">Project:</div>
                <div className="font-medium text-right truncate">{session?.project_name}</div>
                <div className="text-gray-600">Questions:</div>
                <div className="font-medium text-right">{session?.total_questions}</div>
                <div className="text-gray-600">Language:</div>
                <div className="font-medium text-right truncate">
                  {LANGUAGE_OPTIONS.find(l => l.code === selectedLanguage)?.name}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setInterviewState('mode_select')}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-base sm:text-lg font-semibold flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            >
              <Phone className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              Start Interview
            </button>
          </div>
        );
      
      case 'mode_select':
        return renderModeSelect();
      
      case 'completed':
        return (
          <div className="max-w-md mx-auto py-4 sm:py-8 px-4 text-center">
            <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-green-500 mx-auto mb-4 sm:mb-6" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Complete! 🎉</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Thank you, {session?.beneficiary_first_name || session?.beneficiary_name?.split(' ')[0]}!</p>
            
            <div className="bg-green-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">{session?.answered_questions}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Answered</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">100%</div>
                  <div className="text-xs sm:text-sm text-gray-600">Complete</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">{formatTimeDetailed(totalRecordingTime)}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Recorded</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'paused':
        return (
          <div className="max-w-md mx-auto py-4 sm:py-8 px-4 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-yellow-100 rounded-full flex items-center justify-center">
              <Pause className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Interview Paused</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Your progress has been saved.</p>
            
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex justify-between mb-2 text-sm sm:text-base">
                <span>Progress:</span>
                <span className="font-bold">{session?.answered_questions}/{session?.total_questions}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${session?.progress_percentage || 0}%` }} />
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                <span>Total Recording:</span>
                <span className="font-mono">{formatTimeDetailed(totalRecordingTime)}</span>
              </div>
            </div>
            
            <button 
              onClick={resumeInterview} 
              className="w-full py-3 sm:py-4 bg-green-600 text-white rounded-xl text-base sm:text-lg font-semibold flex items-center justify-center hover:bg-green-700 transition-all"
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              Resume Interview
            </button>
            
            <p className="text-xs text-gray-500 mt-2 sm:mt-3">Recording will auto-start when you resume</p>
          </div>
        );
      
      default:
        return renderActiveInterview();
    }
  };
  
  const renderActiveInterview = () => (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-3 sm:px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg mr-2 flex-shrink-0"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mr-2 flex-shrink-0" />
            <span className="font-semibold truncate text-sm sm:text-base">{session?.project_name}</span>
          </div>
          
          {interviewMode === 'video' && (
            <VideoPreview 
              videoRef={videoPreviewRef} 
              isRecording={isRecording}
              isVisible={true}
              recordingTime={recordingTime}
              totalRecordingTime={totalRecordingTime}
            />
          )}
          
          {interviewMode === 'audio' && (
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-gray-100 rounded-lg flex-shrink-0">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
              <span className="text-xs sm:text-sm font-mono text-gray-600">{formatTimeDetailed(totalRecordingTime)}</span>
              {isRecording && (
                <span className="flex items-center gap-1 text-red-500">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold">{formatTime(recordingTime)}</span>
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100">
              {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button onClick={() => setShowSettings(true)} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={handleLeaveClick} 
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center gap-1"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </div>
        
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="truncate">{session?.current_section_name || 'Interview'}</span>
            <span>{session?.answered_questions}/{session?.total_questions}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${session?.progress_percentage || 0}%` }} />
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {conversation.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
              msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white shadow-sm rounded-bl-sm'
            }`}>
              <p className="text-sm">{msg.content}</p>
              {msg.audioUrl && msg.role === 'assistant' && (
                <button
                  onClick={() => playAudio(msg.audioUrl!).catch(() => {})}
                  className="mt-2 text-xs flex items-center opacity-70 hover:opacity-100"
                  disabled={aiSpeaking}
                >
                  <Play className="w-3 h-3 mr-1" /> Replay
                </button>
              )}
            </div>
          </div>
        ))}
        
        {currentQuestion && ['listening', 'speaking'].includes(interviewState) && (
          <div className={`rounded-lg p-3 text-sm border ${
            waitingForValidAnswer ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className={`font-medium mb-1 text-xs sm:text-sm ${waitingForValidAnswer ? 'text-yellow-800' : 'text-blue-800'}`}>
              {waitingForValidAnswer ? '⚠️ Please answer:' : '📋 Question:'}
            </div>
            <div className={`text-xs sm:text-sm ${waitingForValidAnswer ? 'text-yellow-700' : 'text-blue-700'}`}>
              {currentQuestion.question_text}
            </div>
            {currentQuestion.options?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {currentQuestion.options.map((opt, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded text-xs ${
                    waitingForValidAnswer ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>{opt}</span>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div ref={conversationEndRef} />
      </div>
      
      {error && (
        <div className="mx-3 sm:mx-4 mb-2 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm text-center">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">×</button>
        </div>
      )}
      
      {showTextInput && (
        <div className="mx-3 sm:mx-4 mb-2 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="text-yellow-800 text-xs mb-2">Type your response:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type here..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
              onKeyPress={(e) => e.key === 'Enter' && processTextResponse(textInput)}
            />
            <button
              onClick={() => processTextResponse(textInput)}
              disabled={!textInput.trim()}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 text-sm flex-shrink-0"
            >
              Send
            </button>
          </div>
          <button
            onClick={() => { setShowTextInput(false); if (handsFreeMode) startListening(); }}
            className="mt-2 text-xs text-gray-500"
          >
            Try voice again
          </button>
        </div>
      )}
      
      {/* Main controls */}
      <div className="bg-white border-t px-3 sm:px-4 py-4 flex-shrink-0">
        <TurnIndicator
          currentTurn={turnState}
          aiSpeaking={aiSpeaking}
          canRecord={canRecord}
          isRecording={isRecording}
          isListening={isListening}
          audioLevel={audioLevel}
          handsFreeMode={handsFreeMode}
          voiceThreshold={voiceDetectionThreshold}
          interviewMode={interviewMode}
          onManualStart={manualStartRecording}
          onManualStop={manualStopRecording}
          onContainerClick={resumeAudioContext}
          audioContextState={audioContextState}
        />
        
        {isRecording && interviewMode === 'audio' && (
          <div className="flex justify-center mt-3">
            <span className="font-mono text-red-500 flex items-center text-sm">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse mr-2" />
              {formatTime(recordingTime)}
            </span>
          </div>
        )}
        
        {aiSpeaking && bargeInEnabled && (
          <div className="flex justify-center mt-3">
            <button onClick={handleBargeIn} className="text-xs sm:text-sm text-gray-500 hover:text-blue-600 flex items-center">
              <SkipForward className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Skip AI
            </button>
          </div>
        )}
      </div>
      
      <LeaveConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onPause={pauseInterview}
        onStop={stopInterview}
        totalRecordingTime={totalRecordingTime}
        answeredQuestions={session?.answered_questions || 0}
        totalQuestions={session?.total_questions || 0}
      />
      
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-5 max-w-sm w-full shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-semibold">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Mode</div>
                    <div className="font-medium flex items-center mt-1 text-sm">
                      {interviewMode === 'video' ? (
                        <>
                          <Video className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-blue-500" />
                          Video
                        </>
                      ) : (
                        <>
                          <AudioLines className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-green-500" />
                          Audio
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Total Recorded</div>
                    <div className="font-medium font-mono mt-1 text-sm">{formatTimeDetailed(totalRecordingTime)}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm sm:text-base">Hands-Free Mode</div>
                  <div className="text-xs text-gray-500">Auto-detect speech</div>
                </div>
                <button
                  onClick={() => setHandsFreeMode(!handsFreeMode)}
                  className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-colors relative ${handsFreeMode ? 'bg-purple-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full transition-transform ${handsFreeMode ? 'translate-x-5 sm:translate-x-6' : ''}`} />
                </button>
              </div>
              
              {handsFreeMode && (
                <>
                  <div>
                    <div className="font-medium mb-1 text-sm sm:text-base">Microphone Volume: {microphoneGain}x</div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={microphoneGain}
                      onChange={(e) => {
                        const newGain = parseFloat(e.target.value);
                        setMicrophoneGain(newGain);
                        // Update existing gain node if available
                        if ((window as any).micGainNode) {
                          (window as any).micGainNode.gain.value = newGain;
                        }
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Normal (1x)</span>
                      <span>Very Loud (5x)</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium mb-1 text-sm sm:text-base">Voice Threshold: {voiceDetectionThreshold}</div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={voiceDetectionThreshold}
                      onChange={(e) => setVoiceDetectionThreshold(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Very Sensitive</span>
                      <span>Less Sensitive</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium mb-1 text-sm sm:text-base">Silence Duration: {silenceDuration/1000}s</div>
                    <input
                      type="range"
                      min="1000"
                      max="5000"
                      step="500"
                      value={silenceDuration}
                      onChange={(e) => setSilenceDuration(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>1s</span>
                      <span>5s</span>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm sm:text-base">Allow Skip AI</div>
                  <div className="text-xs text-gray-500">Interrupt AI speaking</div>
                </div>
                <button
                  onClick={() => setBargeInEnabled(!bargeInEnabled)}
                  className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-colors relative ${bargeInEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full transition-transform ${bargeInEnabled ? 'translate-x-5 sm:translate-x-6' : ''}`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm sm:text-base">Mute AI Voice</div>
                </div>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-colors relative ${isMuted ? 'bg-red-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full transition-transform ${isMuted ? 'translate-x-5 sm:translate-x-6' : ''}`} />
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-4 sm:mt-5 py-2 bg-blue-600 text-white rounded-lg text-sm sm:text-base"
            >
              Done
            </button>
          </div>
        </div> 
      )}
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      {renderContent()}
    </div>
  );
};

export default AIVoiceInterviewPage;
