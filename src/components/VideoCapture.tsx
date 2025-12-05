/**
 * VideoCapture.tsx
 * React component for capturing video during AI interviews.
 * Place this file in: frontend/src/components/VideoCapture.tsx
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';

// Types
interface VideoSettings {
  video_enabled: boolean;
  capture_full_interview: boolean;
  capture_per_question: boolean;
  require_consent: boolean;
  consent_captured: boolean;
  preferred_resolution: '480p' | '720p' | '1080p';
  max_duration_seconds: number;
  auto_analyze: boolean;
  blur_background: boolean;
}

interface VideoCaptureProps {
  accessToken: string;
  apiBaseUrl: string;
  onVideoUploaded?: (videoId: number) => void;
  onError?: (error: string) => void;
  onConsentChange?: (consented: boolean) => void;
  questionId?: number;
  videoType?: 'question_response' | 'consent_verification' | 'environment_scan';
  autoStart?: boolean;
  showPreview?: boolean;
  compact?: boolean;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  blob: Blob | null;
}

// Resolution configurations
const RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '480p': { width: 640, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 }
};

// Main Component
const VideoCapture: React.FC<VideoCaptureProps> = ({
  accessToken,
  apiBaseUrl,
  onVideoUploaded,
  onError,
  onConsentChange,
  questionId,
  videoType = 'question_response',
  autoStart = false,
  showPreview = true,
  compact = false
}) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [settings, setSettings] = useState<VideoSettings | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    blob: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [consentCaptured, setConsentCaptured] = useState(false);

  // Fetch video settings on mount
  useEffect(() => {
    fetchVideoSettings();
    return () => {
      stopStream();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [accessToken]);

  // Auto-start recording if enabled
  useEffect(() => {
    if (autoStart && settings?.video_enabled && consentCaptured && hasPermission) {
      startRecording();
    }
  }, [autoStart, settings, consentCaptured, hasPermission]);

  const fetchVideoSettings = async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/ai-interviews/public/${accessToken}/video-settings/`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setConsentCaptured(data.consent_captured);
        
        if (data.video_enabled && !data.consent_captured && data.require_consent) {
          setShowConsentDialog(true);
        } else if (data.video_enabled) {
          await requestCameraPermission(data.preferred_resolution);
        }
      } else {
        // If endpoint doesn't exist yet, use defaults
        setSettings({
          video_enabled: true,
          capture_full_interview: false,
          capture_per_question: true,
          require_consent: true,
          consent_captured: false,
          preferred_resolution: '720p',
          max_duration_seconds: 300,
          auto_analyze: true,
          blur_background: false
        });
        setShowConsentDialog(true);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching video settings:', err);
      // Use defaults on error
      setSettings({
        video_enabled: true,
        capture_full_interview: false,
        capture_per_question: true,
        require_consent: true,
        consent_captured: false,
        preferred_resolution: '720p',
        max_duration_seconds: 300,
        auto_analyze: true,
        blur_background: false
      });
      setIsLoading(false);
    }
  };

  const requestCameraPermission = async (resolution: '480p' | '720p' | '1080p' = '720p') => {
    try {
      const res = RESOLUTIONS[resolution] || RESOLUTIONS['720p'];
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: res.width },
          height: { ideal: res.height },
          facingMode: 'user'
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setHasPermission(true);
    } catch (err) {
      console.error('Camera permission error:', err);
      setHasPermission(false);
      setError('Camera access denied. Please allow camera access to continue.');
      onError?.('Camera access denied');
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleConsentResponse = async (consented: boolean) => {
    setShowConsentDialog(false);
    
    try {
      const formData = new FormData();
      formData.append('consent_given', consented.toString());
      
      // Try to submit consent to backend
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/ai-interviews/public/${accessToken}/video-consent/`,
          {
            method: 'POST',
            body: formData
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setConsentCaptured(consented);
          onConsentChange?.(consented);
        }
      } catch (e) {
        // If endpoint doesn't exist, just proceed locally
        console.warn('Video consent endpoint not available');
      }
      
      setConsentCaptured(consented);
      onConsentChange?.(consented);
      
      if (consented) {
        await requestCameraPermission(settings?.preferred_resolution || '720p');
      }
    } catch (err) {
      console.error('Consent submission error:', err);
      setError('Failed to submit consent');
    }
  };

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      setError('Camera not available');
      return;
    }

    chunksRef.current = [];
    
    // Try different codecs
    let options: MediaRecorderOptions = {};
    const codecs = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    
    for (const codec of codecs) {
      if (MediaRecorder.isTypeSupported(codec)) {
        options.mimeType = codec;
        break;
      }
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: options.mimeType || 'video/webm' });
        setRecording(prev => ({ ...prev, blob, isRecording: false }));
      };
      
      mediaRecorder.start(1000);
      
      timerRef.current = setInterval(() => {
        setRecording(prev => {
          const newDuration = prev.duration + 1;
          
          if (settings?.max_duration_seconds && newDuration >= settings.max_duration_seconds) {
            stopRecording();
          }
          
          return { ...prev, duration: newDuration };
        });
      }, 1000);
      
      setRecording(prev => ({ ...prev, isRecording: true, isPaused: false, duration: 0 }));
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording');
      onError?.('Failed to start recording');
    }
  }, [settings]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecording(prev => ({ ...prev, isPaused: true }));
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecording(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
      setRecording(prev => ({ ...prev, isPaused: false }));
    }
  }, []);

  const discardRecording = useCallback(() => {
    setRecording({
      isRecording: false,
      isPaused: false,
      duration: 0,
      blob: null
    });
    chunksRef.current = [];
  }, []);

  const uploadVideo = async () => {
    if (!recording.blob) {
      setError('No video to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', recording.blob, `recording_${Date.now()}.webm`);
      formData.append('video_type', videoType);
      formData.append('duration_seconds', recording.duration.toString());
      formData.append('recorded_at', new Date().toISOString());
      
      if (questionId) {
        formData.append('question_id', questionId.toString());
      }

      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      const response = await new Promise<any>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({ success: true, video_id: 0 });
            }
          } else {
            reject(new Error(xhr.responseText || 'Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        
        xhr.open('POST', `${apiBaseUrl}/api/ai-interviews/public/${accessToken}/upload-video/`);
        xhr.send(formData);
      });

      setIsUploading(false);
      setUploadProgress(100);
      
      discardRecording();
      onVideoUploaded?.(response.video_id);
      
    } catch (err: any) {
      console.error('Upload error:', err);
      setIsUploading(false);
      setError('Failed to upload video');
      onError?.('Failed to upload video');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <span className="ml-2 text-gray-600">Loading video settings...</span>
      </div>
    );
  }

  // Video disabled
  if (settings && !settings.video_enabled) {
    return null;
  }

  // Consent dialog
  if (showConsentDialog) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📹 Video Recording Consent
          </h3>
          <p className="text-gray-600 mb-4">
            This interview includes video recording to help verify the authenticity of responses 
            and assess the impact of the grant.
          </p>
          <p className="text-gray-600 mb-6">
            Do you consent to video recording during this interview?
          </p>
          <div className="flex space-x-4">
            <button
              onClick={() => handleConsentResponse(true)}
              className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition font-medium"
            >
              Yes, I consent
            </button>
            <button
              onClick={() => handleConsentResponse(false)}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition font-medium"
            >
              No, skip video
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">
          ⚠️ Camera access was denied. Please allow camera access in your browser settings to record video.
        </p>
        <button
          onClick={() => requestCameraPermission(settings?.preferred_resolution || '720p')}
          className="mt-2 text-red-600 underline hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  // Not consented
  if (!consentCaptured) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-gray-600">Video recording disabled</p>
      </div>
    );
  }

  return (
    <div className={`video-capture-container ${compact ? 'p-2' : 'p-4'} bg-gray-50 rounded-lg`}>
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 text-sm underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Video preview */}
      {showPreview && (
        <div className="relative bg-black rounded-lg overflow-hidden mb-4">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full ${compact ? 'h-32' : 'h-48 md:h-64'} object-cover`}
          />
          
          {/* Recording indicator */}
          {recording.isRecording && (
            <div className="absolute top-3 left-3 flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${recording.isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></span>
              <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                {recording.isPaused ? 'PAUSED' : 'REC'} {formatDuration(recording.duration)}
              </span>
            </div>
          )}
          
          {/* Max duration warning */}
          {recording.isRecording && settings?.max_duration_seconds && 
           recording.duration >= settings.max_duration_seconds - 30 && (
            <div className="absolute top-3 right-3 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
              {settings.max_duration_seconds - recording.duration}s remaining
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!recording.isRecording && !recording.blob && (
          <button
            onClick={startRecording}
            disabled={!hasPermission}
            className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="w-3 h-3 bg-white rounded-full"></span>
            <span>{compact ? 'Record' : 'Start Recording'}</span>
          </button>
        )}

        {recording.isRecording && !recording.isPaused && (
          <>
            <button
              onClick={pauseRecording}
              className="flex items-center space-x-2 bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition"
            >
              <span>⏸</span>
              <span>Pause</span>
            </button>
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <span>⏹</span>
              <span>Stop</span>
            </button>
          </>
        )}

        {recording.isRecording && recording.isPaused && (
          <>
            <button
              onClick={resumeRecording}
              className="flex items-center space-x-2 bg-emerald-500 text-white px-3 py-2 rounded-lg hover:bg-emerald-600 transition"
            >
              <span>▶</span>
              <span>Resume</span>
            </button>
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <span>⏹</span>
              <span>Stop</span>
            </button>
          </>
        )}

        {recording.blob && !isUploading && (
          <>
            <button
              onClick={uploadVideo}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
            >
              <span>⬆</span>
              <span>{compact ? 'Upload' : 'Upload Video'}</span>
            </button>
            <button
              onClick={discardRecording}
              className="flex items-center space-x-2 bg-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              <span>🗑</span>
              <span>Discard</span>
            </button>
          </>
        )}

        {isUploading && (
          <div className="flex items-center space-x-3">
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-600">{uploadProgress}%</span>
          </div>
        )}
      </div>

      {/* Recording info */}
      {recording.blob && !isUploading && (
        <div className="mt-3 text-center text-sm text-gray-600">
          Recording: {formatDuration(recording.duration)} | 
          Size: {(recording.blob.size / 1024 / 1024).toFixed(2)} MB
        </div>
      )}
    </div>
  );
};

export default VideoCapture;