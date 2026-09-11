import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, Video, ShieldCheck, BookOpen, Monitor, Mic, MicOff, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

export default function FocusTracker({ 
  isEnabled, 
  onToggle, 
  onFocusUpdate,
  isSessionActive,
  onShareToggle,
  isSharing,
  onShareFrame,
  photoVerifyEnabled,
  onPhotoVerifyToggle,
  onPhotoCapture,
  onShareAudio
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [focusScore, setFocusScore] = useState(100);
  const [faceDetected, setFaceDetected] = useState(false);
  const [studyMode, setStudyMode] = useState('screen'); // 'screen' | 'desk' (offline book study)
  const [audioSharing, setAudioSharing] = useState(false);
  const [audioRecording, setAudioRecording] = useState(false);
  const [audioSecondsLeft, setAudioSecondsLeft] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const focusHistory = useRef([]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((e) => console.warn('Video play warning:', e));
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      toast.error('Camera permission denied or camera in use. Please allow camera in browser.', { duration: 5000 });
      onToggle?.(false);
    }
  }, [onToggle]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setFaceDetected(false);
  }, [stream]);

  // Activate camera whenever tracking is enabled (allows immediate preview)
  useEffect(() => {
    if (isEnabled) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isEnabled]);

  // Ensure srcObject is updated whenever stream is ready
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const analyzeFocus = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = 320;
    canvas.height = 240;
    ctx.drawImage(video, 0, 0, 320, 240);

    const imageData = ctx.getImageData(0, 0, 320, 240);
    const data = imageData.data;

    let brightnessValues = [];
    for (let y = 30; y < 210; y += 4) {
      for (let x = 60; x < 260; x += 4) {
        const i = (y * 320 + x) * 4;
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        brightnessValues.push(brightness);
      }
    }

    const avg = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
    const variance = brightnessValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / brightnessValues.length;
    
    // Presence detection: comfortably detects user presence in frame without rigid frontal gaze requirements
    // Whether looking at notes, typing, reading, or shifting posture, presence is maintained
    const isPresent = variance > 40 && avg > 10 && avg < 250;

    const isEngaged = isPresent;
    setFaceDetected(isEngaged);

    if (isSessionActive) {
      focusHistory.current.push(isEngaged ? 1 : 0);
      if (focusHistory.current.length > 120) {
        focusHistory.current.shift();
      }

      const newScore = Math.round(
        (focusHistory.current.reduce((a, b) => a + b, 0) / focusHistory.current.length) * 100
      );
      setFocusScore(newScore);
      onFocusUpdate?.(newScore);
    }
  }, [stream, isSessionActive, studyMode, onFocusUpdate]);

  // Analyze face presence and focus
  useEffect(() => {
    if (isEnabled && stream) {
      const interval = setInterval(analyzeFocus, isSessionActive ? 3000 : 1500);
      return () => clearInterval(interval);
    }
  }, [isEnabled, isSessionActive, stream, analyzeFocus]);

  // Capture lightweight low-latency frame (~3KB, 240x180, 0.35 quality) for smooth live video sharing
  const captureFrameDataUrl = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !stream) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 240;
    canvas.height = 180;
    ctx.drawImage(video, 0, 0, 240, 180);
    try {
      return canvas.toDataURL('image/jpeg', 0.35);
    } catch {
      return null;
    }
  }, [stream]);

  // Share frames smoothly (every 1.2s) with room members when live sharing is active
  useEffect(() => {
    if (!isSharing || !isEnabled || !stream) return;
    
    const share = () => {
      const dataUrl = captureFrameDataUrl();
      if (dataUrl) {
        onShareFrame?.(dataUrl);
      }
    };

    share();
    const interval = setInterval(share, 1200);
    return () => clearInterval(interval);
  }, [isSharing, isEnabled, stream, captureFrameDataUrl, onShareFrame]);

  // Audio Sharing: Record short 10s audio voice snippet to share with the room
  const start10sAudioShare = useCallback(async () => {
    if (audioRecording) return;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = audioStream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result;
          if (base64Audio) {
            onShareAudio?.(base64Audio);
            toast.success('10s voice clip shared with study room! 🎙️', { duration: 3000 });
          }
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        audioStream.getTracks().forEach(track => track.stop());
        setAudioRecording(false);
        setAudioSecondsLeft(0);
      };

      mediaRecorder.start(250);
      setAudioRecording(true);
      setAudioSecondsLeft(10);
      toast('Recording 10s audio for room...', { icon: '🎙️', duration: 2500 });

      let remaining = 10;
      const countdownInterval = setInterval(() => {
        remaining -= 1;
        setAudioSecondsLeft(remaining);
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }
      }, 1000);

    } catch (err) {
      console.error('Microphone access failed:', err);
      toast.error('Microphone permission required to share audio');
      setAudioRecording(false);
    }
  }, [audioRecording, onShareAudio]);

  const cancelAudioShare = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setAudioRecording(false);
    setAudioSecondsLeft(0);
  };

  // Photo verification every 45 minutes
  useEffect(() => {
    if (!photoVerifyEnabled || !isEnabled || !isSessionActive || !stream) return;
    const capture = () => {
      const dataUrl = captureFrameDataUrl();
      if (dataUrl) onPhotoCapture?.(dataUrl);
    };
    const interval = setInterval(capture, 45 * 60 * 1000);
    return () => clearInterval(interval);
  }, [photoVerifyEnabled, isEnabled, isSessionActive, stream, captureFrameDataUrl, onPhotoCapture]);

  const scoreColor = focusScore >= 85 ? 'text-emerald-500' : focusScore >= 60 ? 'text-yellow-500' : 'text-red-500';
  const ringColor = focusScore >= 85 ? '#22c55e' : focusScore >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Mode Selector (Screen vs Offline Book Study) */}
      <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
        <button
          type="button"
          onClick={() => setStudyMode('screen')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
            studyMode === 'screen'
              ? 'bg-zinc-800 text-emerald-400 font-medium'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Screen Study</span>
        </button>
        <button
          type="button"
          onClick={() => setStudyMode('desk')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
            studyMode === 'desk'
              ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-medium'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Offline (Book Study)</span>
        </button>
      </div>

      <div className="relative">
        {isEnabled ? (
          <div className="relative w-44 h-36 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} width={320} height={240} />

            {/* Status indicator badge */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 text-[10px]">
              <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className={faceDetected ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                {faceDetected ? 'Active in Session' : 'Away from Frame'}
              </span>
            </div>

            {/* Preview notice when timer is not yet started */}
            {!isSessionActive && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/60 to-transparent pt-4 pb-1 px-2 text-center">
                <span className="text-[10px] text-zinc-300 font-medium">Camera Active • Start Timer to Track</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-44 h-36 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center p-3 text-center">
            <CameraOff className="w-7 h-7 text-zinc-600 mb-1.5" />
            <span className="text-xs font-medium text-zinc-400">Tracking Off</span>
            <span className="text-[10px] text-zinc-600 mt-0.5">Click below to enable webcam</span>
          </div>
        )}
      </div>

      {/* Focus Ring & Score during active session */}
      {isEnabled && isSessionActive && (
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#27272a"
              strokeWidth="6"
            />
            <motion.circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (focusScore / 100) * 251.2}
              animate={{ strokeDashoffset: 251.2 - (focusScore / 100) * 251.2 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold ${scoreColor}`}>
              {focusScore}%
            </span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider">
              Focus
            </span>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggle?.(!isEnabled)}
          className={`text-xs border transition-colors ${
            isEnabled 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {isEnabled ? (
            <>
              <Camera className="w-4 h-4 mr-1.5 text-emerald-400" />
              Tracking Active
            </>
          ) : (
            <>
              <CameraOff className="w-4 h-4 mr-1.5 text-zinc-500" />
              Enable Tracking
            </>
          )}
        </Button>
        
        {isEnabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShareToggle?.(!isSharing)}
            className={`text-xs ${isSharing ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40' : 'text-zinc-400 hover:text-zinc-200'}`}
            title={isSharing ? "Stop sharing camera" : "Share camera with group"}
          >
            <Video className="w-4 h-4 mr-1" />
            {isSharing ? 'Live Video (Active)' : 'Share Video'}
          </Button>
        )}

        {/* 10s Voice Note Sharing */}
        {audioRecording ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelAudioShare}
            className="text-xs text-red-400 bg-red-950/50 border border-red-800 animate-pulse"
            title="Recording 10s voice clip... click to cancel"
          >
            <Radio className="w-4 h-4 mr-1 text-red-400 animate-spin" />
            Rec Audio ({audioSecondsLeft}s)
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={start10sAudioShare}
            className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 border border-cyan-800/40"
            title="Record and broadcast a short 10s audio note to the group"
          >
            <Mic className="w-4 h-4 mr-1" />
            Share 10s Audio
          </Button>
        )}

        {isEnabled && isSessionActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPhotoVerifyToggle?.(!photoVerifyEnabled)}
            className={`text-xs ${photoVerifyEnabled ? 'text-purple-400' : 'text-zinc-500'}`}
            title="Capture a verification photo every 45 minutes"
          >
            <ShieldCheck className="w-4 h-4 mr-1" />
            {photoVerifyEnabled ? 'Verify On' : 'Photo Verify'}
          </Button>
        )}
      </div>

      {studyMode === 'desk' && (
        <p className="text-[11px] text-emerald-400/80 text-center max-w-xs bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-1.5">
          📖 <strong>Offline Study Mode:</strong> Studying from book/desk. Camera shares your study view with the room without strict face-frontal requirements.
        </p>
      )}

      {photoVerifyEnabled && isEnabled && isSessionActive && (
        <p className="text-xs text-purple-400/70 text-center">
          Verification photo captured every 45 min
        </p>
      )}

      {!isEnabled && (
        <p className="text-[11px] text-zinc-500 text-center max-w-xs">
          Camera tracking is processed locally in your browser and never stored without consent.
        </p>
      )}
    </div>
  );
}