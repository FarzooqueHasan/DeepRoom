import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, Settings2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import Timer from '@/components/study/Timer';
import FocusTracker from '@/components/study/FocusTracker';
import MemberList from '@/components/study/MemberList';
import LeaderboardCard from '@/components/study/LeaderboardCard';
import TimerSettings from '@/components/study/TimerSettings';
import SubjectInput from '@/components/study/SubjectInput';
import AntiCheatMonitor from '@/components/study/AntiCheatMonitor';
import SessionHistory from '@/components/study/SessionHistory';
import RoomSettings from '@/components/study/RoomSettings';
import RoomChat from '@/components/study/RoomChat';
import MusicPlayer from '@/components/study/MusicPlayer';
import SpotifyEmbed from '@/components/study/SpotifyEmbed';
import SyncTimerControl from '@/components/study/SyncTimerControl';
import { useRoomNotifications } from '@/components/study/NotificationToast';
import { Toaster } from 'react-hot-toast';
import SharedWhiteboard from '@/components/collaboration/SharedWhiteboard';
import SharedDocEditor from '@/components/collaboration/SharedDocEditor';
import TaskManager from '@/components/collaboration/TaskManager';
import StudyBuddy from '@/components/collaboration/StudyBuddy';

export default function StudyRoom() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('id');

  const { user } = useAuth();
  const [timerPreset, setTimerPreset] = useState('pomodoro');
  const [customMinutes, setCustomMinutes] = useState(null);
  const [subject, setSubject] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [focusScore, setFocusScore] = useState(100);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const currentSessionRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [inactivePeriods, setInactivePeriods] = useState(0);
  const [cameraSharing, setCameraSharing] = useState(false);
  const [breaksTaken, setBreaksTaken] = useState(0);
  const [totalBreakMinutes, setTotalBreakMinutes] = useState(0);
  const [photoVerifyEnabled, setPhotoVerifyEnabled] = useState(false);
  const [verificationPhotos, setVerificationPhotos] = useState([]);
  const verificationPhotosRef = useRef(verificationPhotos);
  verificationPhotosRef.current = verificationPhotos;

  const queryClient = useQueryClient();

  const { data: room, isLoading: isLoadingRoom } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      if (!roomId) return null;
      const res = await base44.entities.Room.filter({ id: roomId });
      return res[0] || null;
    },
    enabled: !!roomId,
    refetchInterval: 2000,
  });

  const { data: memberStatuses = [], refetch: refetchMembers } = useQuery({
    queryKey: ['memberStatuses', roomId],
    queryFn: async () => {
      const statuses = await base44.entities.RoomMemberStatus.filter({ room_id: roomId });
      // Deduplicate by user_email (preferred) or user_id - keep most recent
      const uniqueMap = new Map();
      statuses.forEach(status => {
        const key = (status.user_email && status.user_email.toLowerCase()) || status.user_id;
        const existing = uniqueMap.get(key);
        if (!existing || new Date(status.updated_date || 0) > new Date(existing.updated_date || 0)) {
          uniqueMap.set(key, status);
        }
      });
      return Array.from(uniqueMap.values());
    },
    enabled: !!roomId,
    refetchInterval: 2000,
  });

  // Ensure member status exists and clean duplicates when entering room
  useEffect(() => {
    const ensureMemberStatus = async () => {
      if (!user || !roomId) return;
      
      const allStatuses = await base44.entities.RoomMemberStatus.filter({ room_id: roomId });
      const userEmailLower = user.email?.toLowerCase();
      
      // Find any existing status matching user.id or user.email
      const existing = allStatuses.filter(s => {
        const matchesId = s.user_id && s.user_id === user.id;
        const matchesEmail = userEmailLower && s.user_email && s.user_email.toLowerCase() === userEmailLower;
        return matchesId || matchesEmail;
      });
      
      if (existing.length === 0) {
        await base44.entities.RoomMemberStatus.create({
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          room_id: roomId,
          status: 'offline',
          last_active: new Date().toISOString()
        });
      } else {
        // Keep the most recent, ensure it has current user.id and user.email
        const sorted = existing.sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0));
        const currentActive = sorted[0];
        if (currentActive.user_id !== user.id || currentActive.user_email !== user.email) {
          await base44.entities.RoomMemberStatus.update(currentActive.id, {
            user_id: user.id,
            user_email: user.email,
            user_name: user.full_name,
          });
        }
        // Delete any older duplicate/legacy statuses for this person
        for (let i = 1; i < sorted.length; i++) {
          await base44.entities.RoomMemberStatus.delete(sorted[i].id).catch(() => {});
        }
      }
      queryClient.invalidateQueries({ queryKey: ['memberStatuses', roomId] });
    };
    
    ensureMemberStatus();
  }, [user, roomId, queryClient]);

  // Ensure room.members contains only unique UIDs and member_emails contains unique emails
  useEffect(() => {
    if (!room || !user) return;
    const members = room.members || [];
    const memberEmails = room.member_emails || [];
    const userEmailLower = user.email?.toLowerCase();
    
    // Filter out raw email addresses and legacy local_ IDs from members array
    const cleanedMembers = members.filter(m => {
      if (typeof m !== 'string') return false;
      if (m === user.id) return true;
      if (userEmailLower && (m === user.email || m.toLowerCase() === userEmailLower)) return false;
      if (m.startsWith('local_')) return false;
      if (m.includes('@')) return false;
      return true;
    });
    if (!cleanedMembers.includes(user.id)) {
      cleanedMembers.push(user.id);
    }
    
    const cleanedEmails = Array.from(new Set([...memberEmails, userEmailLower].filter(Boolean)));
    
    const needsMemberUpdate = cleanedMembers.length !== members.length || !members.includes(user.id);
    const needsEmailUpdate = cleanedEmails.length !== memberEmails.length;
    
    if (needsMemberUpdate || needsEmailUpdate) {
      base44.entities.Room.update(room.id, { 
        members: cleanedMembers,
        member_emails: cleanedEmails,
        host_id: (room.host_email && userEmailLower && room.host_email.toLowerCase() === userEmailLower) ? user.id : room.host_id
      }).catch(() => {});
    }
  }, [room?.id, room?.members, room?.member_emails, user?.id, user?.email]);

  const { data: allStats = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => base44.entities.UserStats.list(),
    refetchInterval: 30000,
  });

  const { data: roomSessions = [] } = useQuery({
    queryKey: ['roomSessions', roomId],
    queryFn: () => base44.entities.StudySession.filter({ room_id: roomId }),
    enabled: !!roomId,
    refetchInterval: 30000,
  });

  // Enable notifications
  useRoomNotifications(roomId, user?.id);

  // Subscribe to real-time updates for members and room status
  useEffect(() => {
    if (!roomId) return;
    const unsubMembers = base44.entities.RoomMemberStatus.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['memberStatuses', roomId] });
    });
    const unsubRoom = base44.entities.Room.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    });
    return () => {
      unsubMembers();
      unsubRoom();
    };
  }, [roomId, queryClient]);

  const updateMemberStatus = useCallback(async (status, sessionData = {}) => {
    if (!user || !roomId) return;
    
    // Always fetch fresh data to avoid race conditions
    const existingStatuses = await base44.entities.RoomMemberStatus.filter({ 
      user_id: user.id, 
      room_id: roomId 
    });
    const existing = existingStatuses[0];

    // Maintain session_started_at across button clicks so member timer tallies with central timer!
    const sessionStartedAt = sessionData.session_started_at !== undefined 
      ? sessionData.session_started_at 
      : (status === 'studying' ? (existing?.session_started_at || new Date().toISOString()) : null);

    const statusData = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      room_id: roomId,
      status,
      current_subject: subject,
      focus_score: focusScore,
      camera_enabled: cameraEnabled,
      camera_share_enabled: cameraSharing,
      camera_frame_url: sessionData.camera_frame_url !== undefined ? sessionData.camera_frame_url : (existing?.camera_frame_url || null),
      last_active: new Date().toISOString(),
      session_started_at: sessionStartedAt,
      ...sessionData
    };

    if (existingStatuses.length > 0) {
      // Update the first one and delete any duplicates
      await base44.entities.RoomMemberStatus.update(existingStatuses[0].id, statusData);
      for (let i = 1; i < existingStatuses.length; i++) {
        await base44.entities.RoomMemberStatus.delete(existingStatuses[i].id);
      }
    } else {
      await base44.entities.RoomMemberStatus.create(statusData);
    }
    queryClient.invalidateQueries({ queryKey: ['memberStatuses', roomId] });
  }, [user, roomId, subject, focusScore, cameraEnabled, cameraSharing, queryClient]);

  // Update status when camera or session changes
  useEffect(() => {
    if (!user || !roomId) return;
    
    if (isSessionActive) {
      if (!isPaused) {
        updateMemberStatus('studying', { focus_score: focusScore });
      }
    } else {
      updateMemberStatus('offline');
    }
  }, [isSessionActive, isPaused, cameraEnabled, cameraSharing, user, roomId, focusScore, updateMemberStatus]);

  // Update status periodically when active (only when actively studying, not paused)
  useEffect(() => {
    if (!isSessionActive || isPaused || !user) return;
    
    const interval = setInterval(() => {
      updateMemberStatus('studying', { focus_score: focusScore });
    }, 30000);

    return () => clearInterval(interval);
  }, [isSessionActive, isPaused, user, focusScore, updateMemberStatus]);

  // Keep latest updateMemberStatus in a ref so the leave effect only runs on enter/leave
  const updateMemberStatusRef = useRef(updateMemberStatus);
  updateMemberStatusRef.current = updateMemberStatus;

  // Set offline when leaving
  useEffect(() => {
    if (!user || !roomId) return;
    
    const handleBeforeUnload = () => {
      updateMemberStatusRef.current('offline', { session_started_at: null, camera_frame_url: null, elapsed_seconds: 0 });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateMemberStatusRef.current('offline', { session_started_at: null, camera_frame_url: null, elapsed_seconds: 0 });
    };
  }, [user, roomId]);

  const handleSessionStart = async (startTime) => {
    if (!user || !roomId) return;
    
    setIsSessionActive(true);
    setIsPaused(false);
    const startIso = startTime ? new Date(startTime).toISOString() : new Date().toISOString();
    const session = await base44.entities.StudySession.create({
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      room_id: roomId,
      subject: subject || 'General Focus',
      start_time: startIso,
      camera_enabled: cameraEnabled,
      status: 'active'
    });
    setCurrentSession(session);
    currentSessionRef.current = session;
    await updateMemberStatus('studying', { 
      session_started_at: startIso,
      current_subject: subject || 'General Focus',
      elapsed_seconds: 0
    });
  };

  const handleSessionPause = useCallback(async (elapsedSeconds) => {
    if (!user || !roomId) return;
    setIsPaused(true);
    await updateMemberStatus('paused', { elapsed_seconds: elapsedSeconds });
  }, [user, roomId, updateMemberStatus]);

  const handleSessionResume = useCallback(async (elapsedSeconds) => {
    if (!user || !roomId) return;
    setIsPaused(false);
    const newStartedAt = new Date(Date.now() - (elapsedSeconds || 0) * 1000).toISOString();
    await updateMemberStatus('studying', { 
      session_started_at: newStartedAt,
      focus_score: focusScore 
    });
  }, [user, roomId, focusScore, updateMemberStatus]);

  const handleSessionEnd = async (startTime, endTime, actualSeconds = null) => {
    if (!user || !roomId) return;
    
    // Calculate duration accurately
    let durationSeconds = actualSeconds;
    if (typeof durationSeconds !== 'number' || durationSeconds <= 0) {
      if (startTime && endTime) {
        durationSeconds = Math.max(1, Math.round((new Date(endTime) - new Date(startTime)) / 1000));
      } else {
        durationSeconds = 60;
      }
    }
    // Any session of at least 30 seconds counts as at least 1 minute
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
    const verifiedMinutes = cameraEnabled && focusScore >= 60 ? durationMinutes : 0;
    
    // Calculate points: 10 per study minute, 5 per verified minute, 100 bonus per session
    const pointsEarned = durationMinutes * 10 + verifiedMinutes * 5 + 100;
    
    // Find or recover active session
    let sessionToUpdate = currentSessionRef.current || currentSession;
    if (!sessionToUpdate) {
      try {
        const activeSessions = await base44.entities.StudySession.filter({
          user_id: user.id,
          room_id: roomId,
          status: 'active'
        });
        if (activeSessions.length > 0) {
          sessionToUpdate = activeSessions.sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0))[0];
        }
      } catch (e) {
        console.warn('Fallback active session query:', e);
      }
    }

    const startIso = startTime ? new Date(startTime).toISOString() : (sessionToUpdate?.start_time || new Date(Date.now() - durationSeconds * 1000).toISOString());
    const endIso = endTime ? new Date(endTime).toISOString() : new Date().toISOString();

    if (!sessionToUpdate) {
      try {
        sessionToUpdate = await base44.entities.StudySession.create({
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          room_id: roomId,
          subject: subject || 'General Focus',
          start_time: startIso,
          camera_enabled: cameraEnabled,
          status: 'active'
        });
      } catch (e) {
        console.error('Failed to create fallback session:', e);
      }
    }

    // Generate AI summary
    let aiSummary = '';
    try {
      const prompt = `Create a brief, motivational summary for this study session. Capture the total study duration, break times, and subjects studied.
      - Subject: ${subject || 'General Study'}
      - Total Study Duration: ${durationMinutes} minutes (${durationSeconds}s)
      - Break Time: ${totalBreakMinutes} minutes across ${breaksTaken} break(s)
      - Focus Score: ${focusScore}%
      - Camera Tracking: ${cameraEnabled ? 'Yes' : 'No'}
      - Tab Switches: ${tabSwitches}
      - Inactive Periods: ${inactivePeriods}
      
      Keep it to 2-3 sentences. Mention the total study duration, how much break time was taken, and what subject was studied. Highlight achievements and provide encouragement.`;
      
      aiSummary = await base44.integrations.Core.InvokeLLM({ prompt });
    } catch (error) {
      aiSummary = `Studied ${subject || 'general topics'} for ${durationMinutes} minute${durationMinutes > 1 ? 's' : ''}${totalBreakMinutes > 0 ? ` with ${totalBreakMinutes}m of breaks` : ''}${cameraEnabled ? ` at ${focusScore}% focus` : ''}. Keep up the great work!`;
    }
    
    if (sessionToUpdate?.id) {
      await base44.entities.StudySession.update(sessionToUpdate.id, {
        end_time: endIso,
        duration_minutes: durationMinutes,
        duration_seconds: durationSeconds,
        focus_score: focusScore,
        tab_switches: tabSwitches,
        inactive_periods: inactivePeriods,
        status: 'completed',
        breaks_taken: breaksTaken,
        break_duration_minutes: totalBreakMinutes,
        ai_summary: aiSummary,
        points_earned: pointsEarned,
        verification_photos: verificationPhotosRef.current
      });
    }

    // Update user stats with gamification
    try {
      const existingStats = await base44.entities.UserStats.filter({ user_id: user.id });
      const today = new Date().toISOString().split('T')[0];
      
      if (existingStats.length > 0) {
        const stats = existingStats[0];
        const lastDate = stats.last_study_date;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        let newStreak = stats.current_streak || 0;
        if (lastDate === yesterday) {
          newStreak += 1;
        } else if (lastDate !== today) {
          newStreak = 1;
        }

        const newTotalPoints = (stats.total_points || 0) + pointsEarned;
        const newLevel = Math.floor(newTotalPoints / 1000) + 1;
        const newSessions = (stats.total_sessions || 0) + 1;

        await base44.entities.UserStats.update(stats.id, {
          total_study_minutes: (stats.total_study_minutes || 0) + durationMinutes,
          verified_focus_minutes: (stats.verified_focus_minutes || 0) + verifiedMinutes,
          weekly_study_minutes: (stats.weekly_study_minutes || 0) + durationMinutes,
          weekly_verified_minutes: (stats.weekly_verified_minutes || 0) + verifiedMinutes,
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, stats.longest_streak || 0),
          last_study_date: today,
          total_points: newTotalPoints,
          level: newLevel,
          total_sessions: newSessions
        });

        // Check for badge achievements
        await checkBadgeAchievements(user.id, {
          totalHours: Math.floor(((stats.total_study_minutes || 0) + durationMinutes) / 60),
          streak: newStreak,
          sessions: newSessions
        });
      } else {
        await base44.entities.UserStats.create({
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          total_study_minutes: durationMinutes,
          verified_focus_minutes: verifiedMinutes,
          weekly_study_minutes: durationMinutes,
          weekly_verified_minutes: verifiedMinutes,
          current_streak: 1,
          longest_streak: 1,
          last_study_date: today,
          total_points: pointsEarned,
          level: 1,
          total_sessions: 1
        });

        await checkBadgeAchievements(user.id, { totalHours: 0, streak: 1, sessions: 1 });
      }
    } catch (statsErr) {
      console.warn('Failed to update stats:', statsErr);
    }

    setIsSessionActive(false);
    setIsPaused(false);
    setCurrentSession(null);
    currentSessionRef.current = null;
    setTabSwitches(0);
    setInactivePeriods(0);
    setBreaksTaken(0);
    setTotalBreakMinutes(0);
    setVerificationPhotos([]);
    setPhotoVerifyEnabled(false);
    await updateMemberStatus('offline', { session_started_at: null, camera_frame_url: null, elapsed_seconds: 0 });
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['roomSessions', roomId] });
    queryClient.invalidateQueries({ queryKey: ['userStats', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['myRooms'] });

    toast.success(`🎉 Session completed! +${pointsEarned} points earned (${durationMinutes}m focus)`, { duration: 5000 });
  };

  const checkBadgeAchievements = async (userId, stats) => {
    const existingBadges = await base44.entities.Badge.filter({ user_id: userId });
    const badgeTypes = existingBadges.map(b => b.badge_type);
    
    const newBadges = [];
    
    if (stats.sessions === 1 && !badgeTypes.includes('first_session')) {
      newBadges.push({ user_id: userId, badge_type: 'first_session', earned_date: new Date().toISOString() });
    }
    if (stats.totalHours >= 10 && !badgeTypes.includes('10_hours')) {
      newBadges.push({ user_id: userId, badge_type: '10_hours', earned_date: new Date().toISOString() });
    }
    if (stats.totalHours >= 50 && !badgeTypes.includes('50_hours')) {
      newBadges.push({ user_id: userId, badge_type: '50_hours', earned_date: new Date().toISOString() });
    }
    if (stats.totalHours >= 100 && !badgeTypes.includes('100_hours')) {
      newBadges.push({ user_id: userId, badge_type: '100_hours', earned_date: new Date().toISOString() });
    }
    if (stats.totalHours >= 500 && !badgeTypes.includes('500_hours')) {
      newBadges.push({ user_id: userId, badge_type: '500_hours', earned_date: new Date().toISOString() });
    }
    if (stats.streak >= 7 && !badgeTypes.includes('7_day_streak')) {
      newBadges.push({ user_id: userId, badge_type: '7_day_streak', earned_date: new Date().toISOString() });
    }
    if (stats.streak >= 30 && !badgeTypes.includes('30_day_streak')) {
      newBadges.push({ user_id: userId, badge_type: '30_day_streak', earned_date: new Date().toISOString() });
    }
    if (stats.streak >= 100 && !badgeTypes.includes('100_day_streak')) {
      newBadges.push({ user_id: userId, badge_type: '100_day_streak', earned_date: new Date().toISOString() });
    }

    if (newBadges.length > 0) {
      await base44.entities.Badge.bulkCreate(newBadges);
    }
  };

  const handleBreakStart = () => {
    updateMemberStatus('break');
  };

  const handleBreakEnd = (durationMinutes) => {
    setBreaksTaken(prev => prev + 1);
    setTotalBreakMinutes(prev => prev + durationMinutes);
    updateMemberStatus('studying', { focus_score: focusScore });
  };

  const handleShareFrame = useCallback(async (frameDataUrl) => {
    if (!user || !roomId || !frameDataUrl) return;
    try {
      // frameDataUrl is already a lightweight base64 JPEG data URL (~8KB)
      // Directly persist into RoomMemberStatus for instant real-time sync with room members
      const statuses = await base44.entities.RoomMemberStatus.filter({ user_id: user.id, room_id: roomId });
      if (statuses.length > 0) {
        await base44.entities.RoomMemberStatus.update(statuses[0].id, { 
          camera_frame_url: frameDataUrl,
          camera_share_enabled: true
        });
      }
    } catch (err) {
      console.error('Failed to share frame:', err);
    }
  }, [user, roomId]);

  const handlePhotoCapture = useCallback(async (photoDataUrl) => {
    if (!photoDataUrl) return;
    try {
      setVerificationPhotos(prev => [...prev, photoDataUrl]);
    } catch (err) {
      console.error('Failed to capture verification photo:', err);
    }
  }, []);

  const handleShareAudio = useCallback(async (audioDataUrl) => {
    if (!user || !roomId || !audioDataUrl) return;
    try {
      const statuses = await base44.entities.RoomMemberStatus.filter({ user_id: user.id, room_id: roomId });
      if (statuses.length > 0) {
        await base44.entities.RoomMemberStatus.update(statuses[0].id, {
          audio_clip_url: audioDataUrl,
          audio_clip_timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error('Failed to share audio:', err);
    }
  }, [user, roomId]);

  const copyInviteCode = () => {
    if (room?.invite_code) {
      navigator.clipboard.writeText(room.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpdateRoom = async (settings) => {
    if (!room) return;
    await base44.entities.Room.update(room.id, settings);
    queryClient.invalidateQueries({ queryKey: ['room', roomId] });
  };

  const handleLeaveRoom = async () => {
    if (!room || !user) return;
    const updatedMembers = (room.members || []).filter(id => id !== user.id);
    await base44.entities.Room.update(room.id, { members: updatedMembers });
    
    // Delete member status
    const statuses = await base44.entities.RoomMemberStatus.filter({
      user_id: user.id,
      room_id: roomId
    });
    for (const status of statuses) {
      await base44.entities.RoomMemberStatus.delete(status.id);
    }
    
    window.location.href = createPageUrl('Home');
  };

  const handleDeleteRoom = async () => {
    if (!room) return;
    await base44.entities.Room.delete(room.id);
    
    // Delete all member statuses
    const statuses = await base44.entities.RoomMemberStatus.filter({ room_id: roomId });
    for (const status of statuses) {
      await base44.entities.RoomMemberStatus.delete(status.id);
    }
    
    window.location.href = createPageUrl('Home');
  };

  if (isLoadingRoom) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <div className="text-sm text-zinc-400 font-medium">Entering study room...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4 p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
          <Users className="w-7 h-7 text-zinc-500" />
        </div>
        <h2 className="text-xl font-medium text-zinc-100">Room Not Found</h2>
        <p className="text-sm text-zinc-500 max-w-sm">
          This study room could not be loaded or may have been deleted.
        </p>
        <Link to={createPageUrl('Home')}>
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-medium mt-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Toaster 
        position="top-center"
        toastOptions={{
          className: 'bg-zinc-900 text-zinc-100 border border-zinc-800',
        }}
      />
      <AntiCheatMonitor
        isSessionActive={isSessionActive}
        onTabSwitch={() => setTabSwitches(prev => prev + 1)}
        onInactivity={() => setInactivePeriods(prev => prev + 1)}
      />

      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-medium">{room.name}</h1>
              <button
                onClick={copyInviteCode}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="font-mono">{room.invite_code}</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-sm text-zinc-500 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {memberStatuses.filter(m => m.status !== 'offline').length} active
            </div>
            <RoomSettings
              room={room}
              isHost={room?.host_id === user?.id}
              currentUserId={user?.id}
              onUpdateRoom={handleUpdateRoom}
              onLeaveRoom={handleLeaveRoom}
              onDeleteRoom={handleDeleteRoom}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Timer Area */}
          <div className="lg:col-span-2 space-y-6">
            <SubjectInput
              value={subject}
              onChange={setSubject}
              isLocked={isSessionActive}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center"
            >
              <Timer
                preset={timerPreset}
                customMinutes={customMinutes}
                onSessionStart={handleSessionStart}
                onSessionPause={handleSessionPause}
                onSessionResume={handleSessionResume}
                onSessionEnd={handleSessionEnd}
                onBreakStart={handleBreakStart}
                onBreakEnd={handleBreakEnd}
                isSharedSession={Boolean(room?.is_shared_session)}
                sharedTimerStart={room?.timer_started_at || null}
                sharedDuration={room?.timer_duration_minutes || null}
              />
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <TimerSettings
                  selectedPreset={timerPreset}
                  onPresetChange={setTimerPreset}
                  customMinutes={customMinutes}
                  onCustomChange={setCustomMinutes}
                />
                <SyncTimerControl
                  room={room}
                  isHost={room?.host_id === user?.id}
                  timerPreset={timerPreset}
                  customMinutes={customMinutes}
                />
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center">
                <FocusTracker
                  isEnabled={cameraEnabled}
                  onToggle={setCameraEnabled}
                  onFocusUpdate={setFocusScore}
                  isSessionActive={isSessionActive}
                  onShareToggle={setCameraSharing}
                  isSharing={cameraSharing}
                  onShareFrame={handleShareFrame}
                  photoVerifyEnabled={photoVerifyEnabled}
                  onPhotoVerifyToggle={setPhotoVerifyEnabled}
                  onPhotoCapture={handlePhotoCapture}
                  onShareAudio={handleShareAudio}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="w-full bg-zinc-900 border border-zinc-800 grid grid-cols-4 text-[10px]">
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="stats">Rankings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="members" className="mt-4">
                <MemberList
                  members={memberStatuses}
                  currentUserId={user?.id}
                />
              </TabsContent>
              
              <TabsContent value="chat" className="mt-4">
                <RoomChat roomId={roomId} currentUser={user} />
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <SessionHistory sessions={roomSessions} />
              </TabsContent>
              
              <TabsContent value="stats" className="mt-4 space-y-4">
                <LeaderboardCard
                  stats={allStats}
                  title="Today's Top 5"
                  type="daily"
                  currentUserId={user?.id}
                />
                <LeaderboardCard
                  stats={allStats}
                  title="Weekly Top 5"
                  type="weekly"
                  currentUserId={user?.id}
                />
              </TabsContent>
            </Tabs>

            {/* Collaboration Section */}
            <Tabs defaultValue="buddy" className="w-full">
              <TabsList className="w-full bg-zinc-900 border border-zinc-800 grid grid-cols-4 text-[10px]">
                <TabsTrigger value="buddy">Buddy</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="docs">Docs</TabsTrigger>
                <TabsTrigger value="board">Board</TabsTrigger>
              </TabsList>

              <TabsContent value="buddy" className="mt-4">
                <StudyBuddy
                  roomId={roomId}
                  userId={user?.id}
                  userName={user?.full_name}
                  members={memberStatuses}
                />
              </TabsContent>

              <TabsContent value="tasks" className="mt-4">
                <TaskManager
                  roomId={roomId}
                  userId={user?.id}
                  members={memberStatuses}
                />
              </TabsContent>

              <TabsContent value="docs" className="mt-4">
                <SharedDocEditor
                  roomId={roomId}
                  userId={user?.id}
                  userName={user?.full_name}
                />
              </TabsContent>

              <TabsContent value="board" className="mt-4">
                <SharedWhiteboard
                  roomId={roomId}
                  userId={user?.id}
                />
              </TabsContent>
            </Tabs>
            
            {/* Spotify Embed Player */}
            <SpotifyEmbed 
              room={room}
              isHost={room?.host_id === user?.id}
            />

            {/* Ambient Music Player */}
            <MusicPlayer />
          </div>
        </div>
      </div>
    </div>
  );
}