import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Coffee, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIMER_PRESETS = {
  pomodoro: { work: 25, break: 5, label: 'Pomodoro' },
  '50_10': { work: 50, break: 10, label: '50/10' },
  deep_work: { work: 90, break: 15, label: 'Deep Work' },
  continuous: { work: null, break: null, label: 'Continuous' },
};

export default function Timer({ 
  preset = 'pomodoro', 
  customMinutes = null,
  onSessionStart,
  onSessionPause,
  onSessionResume,
  onSessionEnd,
  onBreakStart,
  onBreakEnd,
  isSharedSession = false,
  sharedTimerStart = null,
  sharedDuration = null
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [breakStartTime, setBreakStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const startBreakTracking = () => {
    setBreakStartTime(new Date());
    onBreakStart?.();
  };

  const endBreakTracking = () => {
    if (breakStartTime) {
      const durationMinutes = Math.max(1, Math.round((new Date() - breakStartTime) / 60000));
      onBreakEnd?.(durationMinutes);
      setBreakStartTime(null);
    }
  };

  const isContinuous = preset === 'continuous' && !customMinutes;

  const getInitialTime = useCallback(() => {
    if (isContinuous) return 0;
    if (customMinutes) return customMinutes * 60;
    return (TIMER_PRESETS[preset]?.work || 25) * 60;
  }, [preset, customMinutes, isContinuous]);

  const getBreakTime = useCallback(() => {
    return (TIMER_PRESETS[preset]?.break || 5) * 60;
  }, [preset]);

  useEffect(() => {
    if (isSharedSession && sharedTimerStart && sharedDuration) {
      const startTime = new Date(sharedTimerStart).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = (sharedDuration * 60) - elapsed;
      
      if (remaining > 0) {
        setTimeLeft(remaining);
        setTotalTime(sharedDuration * 60);
        setIsRunning(true);
        setSessionStartTime(new Date(sharedTimerStart));
      }
    }
  }, [isSharedSession, sharedTimerStart, sharedDuration]);

  useEffect(() => {
    if (!isSharedSession) {
      const initial = getInitialTime();
      setTimeLeft(initial);
      setTotalTime(initial);
      setElapsedSeconds(0);
    }
  }, [preset, customMinutes, getInitialTime, isSharedSession]);

  // Main countdown & elapsed ticking interval
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        if (!isBreak) {
          setElapsedSeconds(prev => prev + 1);
        }
        if (isContinuous) {
          setTimeLeft(prev => prev + 1);
        } else if (timeLeft > 0) {
          setTimeLeft(prev => Math.max(0, prev - 1));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isContinuous, timeLeft, isBreak]);

  // Session completion when countdown reaches zero
  useEffect(() => {
    if (timeLeft === 0 && isRunning && !isContinuous && totalTime > 0) {
      setIsRunning(false);
      if (!isBreak) {
        const completedSeconds = elapsedSeconds > 0 ? elapsedSeconds : totalTime;
        onSessionEnd?.(sessionStartTime, new Date(), completedSeconds);
        // Auto start break
        setIsBreak(true);
        setTimeLeft(getBreakTime());
        setTotalTime(getBreakTime());
        startBreakTracking();
      } else {
        endBreakTracking();
        setIsBreak(false);
        const initial = getInitialTime();
        setTimeLeft(initial);
        setTotalTime(initial);
        setElapsedSeconds(0);
        setSessionStartTime(null);
      }
    }
  }, [timeLeft, isRunning, isContinuous, totalTime, isBreak, elapsedSeconds, sessionStartTime, getBreakTime, getInitialTime, onSessionEnd]);

  const toggleTimer = () => {
    if (!isRunning) {
      // Start or Resume
      if (!isBreak) {
        if (!sessionStartTime) {
          const now = new Date();
          setSessionStartTime(now);
          onSessionStart?.(now);
        } else {
          onSessionResume?.(elapsedSeconds);
        }
      }
      setIsRunning(true);
    } else {
      // Pause
      setIsRunning(false);
      if (!isBreak) {
        onSessionPause?.(elapsedSeconds);
      }
    }
  };

  const resetTimer = () => {
    if (sessionStartTime && !isBreak && elapsedSeconds > 0) {
      onSessionEnd?.(sessionStartTime, new Date(), elapsedSeconds);
    }
    if (isBreak) endBreakTracking();
    setIsRunning(false);
    setIsBreak(false);
    const initial = getInitialTime();
    setTimeLeft(initial);
    setTotalTime(initial);
    setSessionStartTime(null);
    setElapsedSeconds(0);
  };

  const endSession = () => {
    if (sessionStartTime && !isBreak && elapsedSeconds > 0) {
      onSessionEnd?.(sessionStartTime, new Date(), elapsedSeconds);
    }
    if (isBreak) endBreakTracking();
    setIsRunning(false);
    setIsBreak(false);
    const initial = getInitialTime();
    setTimeLeft(initial);
    setTotalTime(initial);
    setSessionStartTime(null);
    setElapsedSeconds(0);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isContinuous ? 100 : (totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0);
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = isContinuous ? 0 : circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-72 h-72">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="144"
            cy="144"
            r="120"
            fill="none"
            stroke="#1f1f1f"
            strokeWidth="8"
          />
          <motion.circle
            cx="144"
            cy="144"
            r="120"
            fill="none"
            stroke={isBreak ? '#eab308' : '#22c55e'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-light text-zinc-100 tracking-wider font-mono">
            {formatTime(timeLeft)}
          </span>
          <span className="text-zinc-500 text-sm mt-2 uppercase tracking-widest">
            {isContinuous ? 'Continuous' : isBreak ? 'Break' : 'Focus'}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 mt-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetTimer}
            className="w-12 h-12 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400"
            disabled={isSharedSession}
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
          
          <Button
            onClick={toggleTimer}
            className={`w-16 h-16 rounded-full ${
              isRunning 
                ? 'bg-zinc-700 hover:bg-zinc-600' 
                : isBreak 
                  ? 'bg-yellow-600 hover:bg-yellow-500' 
                  : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            disabled={isSharedSession && !sharedTimerStart}
          >
            {isRunning ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (!isBreak && isRunning) {
                onSessionEnd?.(sessionStartTime, new Date());
              }
              if (!isBreak) {
                setIsRunning(false);
                setIsBreak(true);
                setTimeLeft(getBreakTime());
                setTotalTime(getBreakTime());
                startBreakTracking();
              } else {
                endBreakTracking();
                setIsBreak(false);
                setTimeLeft(getInitialTime());
                setTotalTime(getInitialTime());
              }
            }}
            className="w-12 h-12 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400"
            disabled={isSharedSession || isContinuous}
          >
            <Coffee className="w-5 h-5" />
          </Button>
        </div>
        
        {isRunning && !isBreak && (
          <Button
            variant="outline"
            size="sm"
            onClick={endSession}
            className="text-xs text-red-400 border-red-400/20 hover:bg-red-400/10"
            disabled={isSharedSession}
          >
            End Session
          </Button>
        )}
      </div>
    </div>
  );
}