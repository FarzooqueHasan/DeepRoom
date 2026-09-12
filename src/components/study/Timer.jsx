import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Coffee, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playCompletionChime, fireCelebration } from '@/lib/studySessions';

const TIMER_PRESETS = {
  pomodoro: { name: 'Pomodoro (25m)', work: 25, break: 5 },
  '50_10': { name: '50 / 10', work: 50, break: 10 },
  deep_work: { name: 'Deep Work (90m)', work: 90, break: 15 },
  stopwatch: { name: 'Stopwatch', work: null, break: 5 },
};

export default function Timer({
  preset = 'pomodoro',
  customMinutes = null,
  onPresetChange,
  onSessionStart,
  onSessionPause,
  onSessionResume,
  onSessionEnd,
  onBreakStart,
  onBreakEnd,
  onTick,
}) {
  const isStopwatch = preset === 'stopwatch' || preset === 'continuous';
  const presetConfig = TIMER_PRESETS[preset] || TIMER_PRESETS.pomodoro;
  const initialFocusSeconds = isStopwatch ? 0 : (customMinutes || presetConfig.work || 25) * 60;
  const breakSeconds = (presetConfig.break || 5) * 60;

  const [timeLeft, setTimeLeft] = useState(initialFocusSeconds);
  const [totalTime, setTotalTime] = useState(initialFocusSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // High-precision wall-clock tracking refs
  const startTimeRef = useRef(null);
  const accumulatedMsRef = useRef(0);
  const sessionStartRef = useRef(null);
  const breakStartRef = useRef(null);
  const isRunningRef = useRef(false);
  const isBreakRef = useRef(false);
  const onSessionEndRef = useRef(onSessionEnd);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onSessionEndRef.current = onSessionEnd;
  }, [onSessionEnd]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    isBreakRef.current = isBreak;
  }, [isBreak]);

  // Reset when preset or custom duration changes (if not running)
  useEffect(() => {
    if (!isRunningRef.current) {
      setTimeLeft(initialFocusSeconds);
      setTotalTime(initialFocusSeconds);
      setElapsedSeconds(0);
      accumulatedMsRef.current = 0;
      startTimeRef.current = null;
      sessionStartRef.current = null;
      onTickRef.current?.(0, initialFocusSeconds);
    }
  }, [preset, customMinutes, initialFocusSeconds]);

  // Wall-clock drift-free timer interval
  useEffect(() => {
    if (!isRunning) return undefined;

    const interval = setInterval(() => {
      if (!startTimeRef.current) return;
      const now = Date.now();
      const currentSegmentMs = now - startTimeRef.current;
      const totalElapsedMs = accumulatedMsRef.current + currentSegmentMs;
      const totalElapsedSecs = Math.floor(totalElapsedMs / 1000);

      setElapsedSeconds(totalElapsedSecs);

      if (isBreakRef.current) {
        // Break countdown
        const remaining = Math.max(0, breakSeconds - totalElapsedSecs);
        setTimeLeft(remaining);
        onTickRef.current?.(totalElapsedSecs, remaining);

        if (remaining === 0) {
          setIsRunning(false);
          setIsBreak(false);
          playCompletionChime();
          const breakMins = Math.max(1, Math.round(totalElapsedSecs / 60));
          onBreakEnd?.(breakMins);
          setTimeLeft(initialFocusSeconds);
          setTotalTime(initialFocusSeconds);
          setElapsedSeconds(0);
          accumulatedMsRef.current = 0;
          startTimeRef.current = null;
          onTickRef.current?.(0, initialFocusSeconds);
        }
      } else if (isStopwatch) {
        // Stopwatch counts up
        setTimeLeft(totalElapsedSecs);
        onTickRef.current?.(totalElapsedSecs, totalElapsedSecs);
      } else {
        // Focus countdown
        const remaining = Math.max(0, initialFocusSeconds - totalElapsedSecs);
        setTimeLeft(remaining);
        onTickRef.current?.(totalElapsedSecs, remaining);

        if (remaining === 0) {
          // Countdown completed
          setIsRunning(false);
          playCompletionChime();
          fireCelebration();

          const finishedStart = sessionStartRef.current || new Date(Date.now() - initialFocusSeconds * 1000);
          const finishedEnd = new Date();
          const actualDuration = Math.max(initialFocusSeconds, totalElapsedSecs);

          onSessionEndRef.current?.(finishedStart, finishedEnd, actualDuration);

          setTimeLeft(initialFocusSeconds);
          setTotalTime(initialFocusSeconds);
          setElapsedSeconds(0);
          accumulatedMsRef.current = 0;
          startTimeRef.current = null;
          sessionStartRef.current = null;
          onTickRef.current?.(0, initialFocusSeconds);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, isStopwatch, initialFocusSeconds, breakSeconds, onBreakEnd]);

  // Toggle Play / Pause
  const toggleTimer = () => {
    const now = Date.now();

    if (isRunning) {
      // Pause
      if (startTimeRef.current) {
        accumulatedMsRef.current += now - startTimeRef.current;
      }
      startTimeRef.current = null;
      setIsRunning(false);

      const pausedSecs = Math.floor(accumulatedMsRef.current / 1000);
      if (!isBreak) {
        onSessionPause?.(pausedSecs);
      }
      onTickRef.current?.(pausedSecs, timeLeft);
      return;
    }

    // Resume / Start
    startTimeRef.current = now;
    if (!sessionStartRef.current && !isBreak) {
      const startDate = new Date();
      sessionStartRef.current = startDate;
      onSessionStart?.(startDate);
    } else if (!isBreak) {
      onSessionResume?.(Math.floor(accumulatedMsRef.current / 1000));
    }

    setIsRunning(true);
  };

  // Reset Timer
  const resetTimer = () => {
    const now = Date.now();
    let finalElapsed = accumulatedMsRef.current;
    if (isRunning && startTimeRef.current) {
      finalElapsed += now - startTimeRef.current;
    }
    const finalSecs = Math.floor(finalElapsed / 1000);

    if (!isBreak && sessionStartRef.current && finalSecs >= 5) {
      onSessionEnd?.(sessionStartRef.current, new Date(), finalSecs);
    }

    if (isBreak && breakStartRef.current) {
      const breakMins = Math.max(1, Math.round(finalSecs / 60));
      onBreakEnd?.(breakMins);
    }

    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(initialFocusSeconds);
    setTotalTime(initialFocusSeconds);
    setElapsedSeconds(0);
    accumulatedMsRef.current = 0;
    startTimeRef.current = null;
    sessionStartRef.current = null;
    breakStartRef.current = null;
    onTickRef.current?.(0, initialFocusSeconds);
  };

  // End Session Early and log
  const endSession = () => {
    const now = Date.now();
    let finalElapsed = accumulatedMsRef.current;
    if (isRunning && startTimeRef.current) {
      finalElapsed += now - startTimeRef.current;
    }
    const finalSecs = Math.max(1, Math.floor(finalElapsed / 1000));

    if (!isBreak && sessionStartRef.current) {
      onSessionEnd?.(sessionStartRef.current, new Date(), finalSecs);
      playCompletionChime();
      fireCelebration();
    }

    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(initialFocusSeconds);
    setTotalTime(initialFocusSeconds);
    setElapsedSeconds(0);
    accumulatedMsRef.current = 0;
    startTimeRef.current = null;
    sessionStartRef.current = null;
    onTickRef.current?.(0, initialFocusSeconds);
  };

  // Start Break
  const startBreak = () => {
    const now = Date.now();
    let finalElapsed = accumulatedMsRef.current;
    if (isRunning && startTimeRef.current) {
      finalElapsed += now - startTimeRef.current;
    }
    const finalSecs = Math.floor(finalElapsed / 1000);

    if (!isBreak && sessionStartRef.current && finalSecs >= 30) {
      onSessionEnd?.(sessionStartRef.current, new Date(), finalSecs);
    }

    accumulatedMsRef.current = 0;
    startTimeRef.current = now;
    breakStartRef.current = new Date();
    setIsBreak(true);
    setIsRunning(true);
    setTimeLeft(breakSeconds);
    setTotalTime(breakSeconds);
    setElapsedSeconds(0);
    onBreakStart?.();
  };

  // Finish Break
  const finishBreak = () => {
    const now = Date.now();
    let finalElapsed = accumulatedMsRef.current;
    if (isRunning && startTimeRef.current) {
      finalElapsed += now - startTimeRef.current;
    }
    const breakMins = Math.max(1, Math.round(finalElapsed / 60000));
    onBreakEnd?.(breakMins);

    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(initialFocusSeconds);
    setTotalTime(initialFocusSeconds);
    setElapsedSeconds(0);
    accumulatedMsRef.current = 0;
    startTimeRef.current = null;
    breakStartRef.current = null;
    onTickRef.current?.(0, initialFocusSeconds);
  };

  const formatTime = (seconds) => {
    const total = Math.max(0, seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = isStopwatch || totalTime === 0 ? 100 : ((totalTime - timeLeft) / totalTime) * 100;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = isStopwatch ? 0 : circumference - (progress / 100) * circumference;
  const statusLabel = isBreak ? 'Break' : isStopwatch ? 'Stopwatch' : 'Focus';

  return (
    <div className="flex flex-col items-center select-none w-full">
      {/* Individual Preset Pills (Clean & Simple) */}
      {!isRunning && !isBreak && onPresetChange && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
          {Object.entries(TIMER_PRESETS).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => onPresetChange(key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                preset === key
                  ? 'bg-emerald-600 text-white shadow-md scale-105'
                  : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {config.name}
            </button>
          ))}
        </div>
      )}

      {/* Circular Clock */}
      <div className="relative w-72 h-72">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="144" cy="144" r="120" fill="none" stroke="#27272a" strokeWidth="8" />
          <motion.circle
            cx="144"
            cy="144"
            r="120"
            fill="none"
            stroke={isBreak ? '#f59e0b' : '#10b981'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-light text-zinc-100 tracking-wider font-mono drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {formatTime(timeLeft)}
          </span>
          <span
            className={`text-xs mt-2 uppercase tracking-widest font-semibold px-2.5 py-0.5 rounded-full ${
              isBreak
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Timer Controls */}
      <div className="flex flex-col items-center gap-4 mt-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetTimer}
            className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all"
            title="Reset timer"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>

          <Button
            onClick={toggleTimer}
            className={`w-16 h-16 rounded-full shadow-lg transition-transform active:scale-95 ${
              isRunning
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
                : isBreak
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
            title={isRunning ? 'Pause' : 'Start'}
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={isBreak ? finishBreak : startBreak}
            className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all"
            title={isBreak ? 'Finish break' : 'Take a break'}
          >
            {isBreak ? <Square className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
          </Button>
        </div>

        {/* End Session Button when study session has progress */}
        {!isBreak && (isRunning || elapsedSeconds > 0) && (
          <Button
            variant="outline"
            size="sm"
            onClick={endSession}
            className="text-xs text-red-400 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
          >
            End Session & Save
          </Button>
        )}
      </div>
    </div>
  );
}
