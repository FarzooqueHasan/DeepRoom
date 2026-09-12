import { base44 } from '@/api/base44Client';
import confetti from 'canvas-confetti';

/**
 * Format duration in seconds into human-readable strings matching reference portal.
 * Examples: '30s', '53m 7s', '1h 5m', '2h 22m'
 */
/**
 * Format duration in seconds into human-readable strings with second accuracy.
 * Examples: '45s', '53m 7s', '1h 5m 30s', '2h 22m', '1h'
 */
export function formatSessionDuration(seconds) {
  const totalSecs = Math.max(0, Math.round(Number(seconds) || 0));
  if (totalSecs === 0) return '0s';

  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const remainingSecs = totalSecs % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSecs > 0 || parts.length === 0) parts.push(`${remainingSecs}s`);

  return parts.join(' ');
}

/**
 * Format summary duration for cards/stats with exact seconds accuracy.
 * Examples: '12h 45m 10s', '45s', or '0s' if empty
 */
export function formatCardDuration(seconds) {
  const totalSecs = Math.max(0, Math.round(Number(seconds) || 0));
  if (totalSecs === 0) return '0s';
  return formatSessionDuration(totalSecs);
}

/**
 * Badge styling per subject matching reference screenshots
 */
export function getSubjectBadge(subject = '') {
  const norm = (subject || '').trim().toLowerCase();
  if (norm.includes('math')) {
    return {
      bg: 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
      color: '#10b981',
      name: 'Maths',
    };
  }
  if (norm.includes('chem')) {
    return {
      bg: 'bg-amber-950/80 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
      color: '#f59e0b',
      name: 'Chemistry',
    };
  }
  if (norm.includes('phys')) {
    return {
      bg: 'bg-sky-950/80 text-sky-400 border border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.15)]',
      color: '#0ea5e9',
      name: 'Physics',
    };
  }
  if (norm.includes('bio')) {
    return {
      bg: 'bg-purple-950/80 text-purple-400 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]',
      color: '#a855f7',
      name: 'Biology',
    };
  }
  if (norm.includes('code') || norm.includes('prog') || norm.includes('dev')) {
    return {
      bg: 'bg-indigo-950/80 text-indigo-400 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]',
      color: '#6366f1',
      name: 'Coding',
    };
  }
  return {
    bg: 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50',
    color: '#a1a1aa',
    name: subject || 'General',
  };
}

/**
 * Format date in 'Sep 11, 2026' or 'Sep 11' format
 */
export function formatSessionDate(dateInput, includeYear = true) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  if (includeYear) {
    return `${month} ${day}, ${year}`;
  }
  return `${month} ${day}`;
}

/**
 * Return local Date string YYYY-MM-DD for accurate day boundary
 */
export function getLocalDateString(d = new Date()) {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate user aggregates (Today, This Week, This Month, Streak, 7-Day breakdown)
 */
export function calculateUserAggregates(sessions = []) {
  const completed = (sessions || []).filter(
    (s) => s.status === 'completed' && (s.duration_seconds > 0 || s.duration_minutes > 0)
  );

  const now = new Date();
  const todayKey = getLocalDateString(now);

  // Calculate start of current week (Monday at 00:00:00 local time)
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);

  // Calculate start of current month (1st of month at 00:00:00 local time)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  let todaySeconds = 0;
  let weekSeconds = 0;
  let monthSeconds = 0;
  let totalSeconds = 0;

  // Track unique active study days
  const studyDatesSet = new Set();

  completed.forEach((s) => {
    const durSec =
      s.duration_seconds !== undefined && s.duration_seconds !== null
        ? Math.max(0, Math.round(Number(s.duration_seconds)))
        : Math.max(0, Math.round(Number(s.duration_minutes || 0) * 60));
    const sDate = new Date(s.start_time || s.created_date || s.end_time || 0);
    if (isNaN(sDate.getTime())) return;

    totalSeconds += durSec;
    const dateKey = getLocalDateString(sDate);
    studyDatesSet.add(dateKey);

    if (dateKey === todayKey) {
      todaySeconds += durSec;
    }

    if (sDate >= startOfWeek) {
      weekSeconds += durSec;
    }

    if (sDate >= startOfMonth) {
      monthSeconds += durSec;
    }
  });

  // Calculate consecutive day streak
  let streak = 0;
  const checkDate = new Date(now);
  const checkKey = getLocalDateString(checkDate);

  if (studyDatesSet.has(checkKey)) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // Check if user studied yesterday
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayKey = getLocalDateString(checkDate);
    if (studyDatesSet.has(yesterdayKey)) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  if (streak > 0) {
    while (true) {
      const prevKey = getLocalDateString(checkDate);
      if (studyDatesSet.has(prevKey)) {
        streak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate 7-Day daily breakdown (matching screenshot 3: e.g. 6 Sun, 7 Mon, etc.)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7Days = [];

  for (let i = 6; i >= 0; i--) {
    const target = new Date(now);
    target.setDate(target.getDate() - i);
    const targetKey = getLocalDateString(target);
    const dayName = dayNames[target.getDay()];
    const dayNum = target.getDate();

    let daySecs = 0;
    completed.forEach((s) => {
      const sDate = new Date(s.start_time || s.created_date || s.end_time || 0);
      if (getLocalDateString(sDate) === targetKey) {
        daySecs +=
          s.duration_seconds !== undefined && s.duration_seconds !== null
            ? Math.max(0, Math.round(Number(s.duration_seconds)))
            : Math.max(0, Math.round(Number(s.duration_minutes || 0) * 60));
      }
    });

    last7Days.push({
      dateKey: targetKey,
      dayLabel: `${dayNum} ${dayName}`,
      seconds: daySecs,
      hours: Number((daySecs / 3600).toFixed(2)),
    });
  }

  return {
    todaySeconds,
    weekSeconds,
    monthSeconds,
    totalSeconds,
    streakDays: streak,
    totalSessions: completed.length,
    last7Days,
  };
}

/**
 * Play subtle pleasing audio chime upon timer completion
 */
export function playCompletionChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.12 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.12);
      osc.stop(ctx.currentTime + index * 0.12 + 0.55);
    });
  } catch (err) {
    // AudioContext might be blocked until user gesture, ignore safely
  }
}

/**
 * Play authentic ringing room alarm / attention bell
 */
export function playRoomAlarm() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // 4 crisp high-energy bell pulses simulating a real alarm bell
    [0, 0.22, 0.44, 0.66, 0.88].forEach((delay) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + delay + 0.15);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc2.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.21);
      osc2.stop(ctx.currentTime + delay + 0.21);
    });
  } catch (err) {
    console.warn('[playRoomAlarm] Audio error:', err);
  }
}

/**
 * Trigger celebration confetti
 */
export function fireCelebration() {
  try {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#a855f7', '#0ea5e9', '#f59e0b'],
    });
  } catch {
    // Ignore if canvas-confetti is not available
  }
}

/**
 * Atomic session logger: persists session to StudySession and updates UserStats
 */
export async function logCompletedSession({
  user,
  roomId = 'personal',
  subject = 'General Study',
  note = '',
  startTime,
  endTime,
  durationSeconds = 0,
  cameraEnabled = false,
  focusScore = 100,
  breaksTaken = 0,
  breakDurationMinutes = 0,
  queryClient = null,
}) {
  if (!user?.id) {
    console.warn('[logCompletedSession] No user provided, session cannot be logged.');
    return null;
  }

  const durSecs = Math.max(1, Math.round(Number(durationSeconds) || 0));
  const durMins = Number((durSecs / 60).toFixed(2));
  const startIso = startTime ? new Date(startTime).toISOString() : new Date(Date.now() - durSecs * 1000).toISOString();
  const endIso = endTime ? new Date(endTime).toISOString() : new Date().toISOString();
  const verifiedSeconds = cameraEnabled && focusScore >= 60 ? durSecs : 0;
  const verifiedMinutes = Number((verifiedSeconds / 60).toFixed(2));
  // Exact seconds points calculation (10 pts/min = 1 pt/6s)
  const pointsEarned = Math.max(50, Math.round(durSecs * (10 / 60) + (verifiedSeconds * (5 / 60)) + 50));

  const sessionData = {
    user_id: user.id,
    user_email: user.email || '',
    user_name: user.full_name || user.email?.split('@')[0] || 'User',
    room_id: roomId || 'personal',
    subject: subject || 'General Study',
    note: note || subject || 'Focus session',
    start_time: startIso,
    end_time: endIso,
    duration_seconds: durSecs,
    duration_minutes: durMins,
    status: 'completed',
    camera_enabled: Boolean(cameraEnabled),
    focus_score: focusScore,
    breaks_taken: breaksTaken,
    break_duration_minutes: breakDurationMinutes,
    points_earned: pointsEarned,
    created_date: endIso,
  };

  let savedSession = null;
  try {
    savedSession = await base44.entities.StudySession.create(sessionData);
  } catch (err) {
    console.error('[logCompletedSession] Error creating StudySession in entity store:', err);
  }

  // Update or create UserStats
  try {
    const existing = await base44.entities.UserStats.filter({ user_id: user.id });
    const today = getLocalDateString(new Date());

    if (existing.length > 0) {
      const stat = existing[0];
      const prevTotalSecs =
        stat.total_study_seconds !== undefined && stat.total_study_seconds !== null
          ? Number(stat.total_study_seconds)
          : Math.round(Number(stat.total_study_minutes || 0) * 60);
      const prevWeeklySecs =
        stat.weekly_study_seconds !== undefined && stat.weekly_study_seconds !== null
          ? Number(stat.weekly_study_seconds)
          : Math.round(Number(stat.weekly_study_minutes || 0) * 60);
      const prevVerifiedSecs =
        stat.verified_focus_seconds !== undefined && stat.verified_focus_seconds !== null
          ? Number(stat.verified_focus_seconds)
          : Math.round(Number(stat.verified_focus_minutes || 0) * 60);

      const newTotalSecs = prevTotalSecs + durSecs;
      const newWeeklySecs = prevWeeklySecs + durSecs;
      const newVerifiedSecs = prevVerifiedSecs + verifiedSeconds;

      const newTotalMinutes = Number((newTotalSecs / 60).toFixed(2));
      const newWeeklyMinutes = Number((newWeeklySecs / 60).toFixed(2));
      const newVerifiedMinutes = Number((newVerifiedSecs / 60).toFixed(2));
      const newPoints = (stat.total_points || 0) + pointsEarned;
      const newSessions = (stat.total_sessions || 0) + 1;

      await base44.entities.UserStats.update(stat.id, {
        total_study_seconds: newTotalSecs,
        weekly_study_seconds: newWeeklySecs,
        verified_focus_seconds: newVerifiedSecs,
        total_study_minutes: newTotalMinutes,
        weekly_study_minutes: newWeeklyMinutes,
        verified_focus_minutes: newVerifiedMinutes,
        weekly_verified_minutes: newVerifiedMinutes,
        last_study_date: today,
        total_points: newPoints,
        total_sessions: newSessions,
        level: Math.floor(newPoints / 1000) + 1,
      });
    } else {
      await base44.entities.UserStats.create({
        user_id: user.id,
        user_email: user.email || '',
        user_name: user.full_name || user.email?.split('@')[0] || 'User',
        total_study_seconds: durSecs,
        weekly_study_seconds: durSecs,
        verified_focus_seconds: verifiedSeconds,
        total_study_minutes: durMins,
        weekly_study_minutes: durMins,
        verified_focus_minutes: verifiedMinutes,
        weekly_verified_minutes: verifiedMinutes,
        current_streak: 1,
        longest_streak: 1,
        last_study_date: today,
        total_points: pointsEarned,
        level: 1,
        total_sessions: 1,
      });
    }
  } catch (err) {
    console.warn('[logCompletedSession] UserStats update error:', err);
  }

  // Invalidate queries if queryClient is provided
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ['userSessions'] });
    queryClient.invalidateQueries({ queryKey: ['recentSessions'] });
    queryClient.invalidateQueries({ queryKey: ['userStats'] });
    queryClient.invalidateQueries({ queryKey: ['allSessions'] });
    queryClient.invalidateQueries({ queryKey: ['allStats'] });
    queryClient.invalidateQueries({ queryKey: ['roomSessions'] });
    queryClient.invalidateQueries({ queryKey: ['groupLeaderboard'] });
  }

  // Sound and visual celebration
  playCompletionChime();
  fireCelebration();

  return savedSession || sessionData;
}
