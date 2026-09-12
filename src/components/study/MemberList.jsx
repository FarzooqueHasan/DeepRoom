import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Camera, CameraOff, Clock, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StatusIndicator = ({ status }) => {
  const colors = {
    studying: 'bg-emerald-500',
    paused: 'bg-amber-500',
    break: 'bg-yellow-500',
    offline: 'bg-zinc-600'
  };
  return (
    <span className={`w-2 h-2 rounded-full ${colors[status] || colors.offline}`} />
  );
};

const StatusTimer = ({ sessionStartedAt, lastActive, status, elapsedSeconds, isCurrentUser, liveUserSeconds }) => {
  const [elapsed, setElapsed] = useState('');

  const formatSecs = (s) => {
    const total = Math.max(0, Math.floor(s || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  useEffect(() => {
    // If current user is studying or paused, keep in 1:1 real-time sync with total timer!
    if (isCurrentUser && liveUserSeconds !== null && liveUserSeconds !== undefined && (status === 'studying' || status === 'paused')) {
      setElapsed(formatSecs(liveUserSeconds));
      return;
    }

    if (status === 'paused') {
      setElapsed(formatSecs(elapsedSeconds || 0));
      return;
    }

    const baseTime = (status === 'studying' && sessionStartedAt) ? sessionStartedAt : lastActive;
    if (!baseTime) {
      setElapsed('');
      return;
    }

    const updateElapsed = () => {
      const startTime = new Date(baseTime);
      const now = new Date();
      const diff = Math.max(0, Math.floor((now - startTime) / 1000));
      
      // For offline, show time since last seen
      if (status === 'offline') {
        if (diff < 60) {
          setElapsed('Just now');
        } else if (diff < 3600) {
          const mins = Math.floor(diff / 60);
          setElapsed(`${mins}m ago`);
        } else {
          const hours = Math.floor(diff / 3600);
          setElapsed(`${hours}h ago`);
        }
        return;
      }
      
      setElapsed(formatSecs(diff));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [sessionStartedAt, lastActive, status, elapsedSeconds, isCurrentUser, liveUserSeconds]);

  if (!elapsed) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
      <Clock className={`w-3 h-3 ${status === 'paused' ? 'text-amber-500' : status === 'break' ? 'text-yellow-500' : status === 'studying' ? 'text-emerald-500' : 'text-zinc-600'}`} />
      {elapsed}
    </div>
  );
};

const FocusBadge = ({ score, cameraEnabled }) => {
  if (!cameraEnabled) return null;
  
  const getColor = () => {
    if (score >= 85) return 'text-emerald-500 border-emerald-500/30 bg-emerald-950/30';
    if (score >= 60) return 'text-yellow-500 border-yellow-500/30 bg-yellow-950/30';
    return 'text-red-500 border-red-500/30 bg-red-950/30';
  };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${getColor()}`}>
      {score}%
    </span>
  );
};

export default function MemberList({ members = [], currentUserId, competitionActive = false, activeUserElapsedSeconds = null }) {
  // Store minimized user ids so sharing feeds are visible by default
  const [minimizedCameras, setMinimizedCameras] = useState({});
  
  const getFocusSeconds = (member) => {
    if (member.status === 'paused') return member.elapsed_seconds || 0;
    if (member.status !== 'studying' || !member.session_started_at) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(member.session_started_at).getTime()) / 1000));
  };

  const sortedMembers = [...members].sort((a, b) => {
    const statusOrder = { studying: 0, paused: 1, break: 2, offline: 3 };
    const statusDifference = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    if (statusDifference !== 0) return statusDifference;
    return getFocusSeconds(b) - getFocusSeconds(a);
  });

  const activeMembers = sortedMembers.filter((member) => ['studying', 'paused'].includes(member.status));

  const statusLabels = {
    studying: 'Studying',
    paused: 'Paused',
    break: 'Break',
    offline: 'Offline'
  };

  const toggleCameraFeed = (userId) => {
    setMinimizedCameras((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-zinc-400 text-xs uppercase tracking-wider">
          {competitionActive ? 'Focus Competition' : 'Room Members'} ({members.length})
        </h3>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {sortedMembers.map((member) => {
            const isSharingCamera = member.camera_enabled && member.camera_share_enabled;
            const isMinimized = minimizedCameras[member.user_id];
            const competitionRank = competitionActive
              ? activeMembers.findIndex((activeMember) => activeMember.user_id === member.user_id) + 1
              : 0;

            return (
              <motion.div
                key={member.user_id || member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-zinc-900 rounded-lg p-3 border border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                        <User className="w-5 h-5" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900">
                        <StatusIndicator status={member.status} />
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {competitionRank > 0 && (
                          <span className="text-[10px] font-mono text-emerald-400">#{competitionRank}</span>
                        )}
                        <span className="text-zinc-100 text-sm font-medium truncate">
                          {member.user_name || 'Anonymous'}
                          {member.user_id === currentUserId && (
                            <span className="text-zinc-500 ml-1">(you)</span>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-zinc-500">
                          {statusLabels[member.status] || member.status || 'Offline'}
                        </span>
                        <span className="text-zinc-700">•</span>
                        <StatusTimer 
                          sessionStartedAt={member.session_started_at}
                          lastActive={member.last_active} 
                          status={member.status}
                          elapsedSeconds={member.user_id === currentUserId && activeUserElapsedSeconds !== null ? activeUserElapsedSeconds : member.elapsed_seconds}
                          isCurrentUser={member.user_id === currentUserId}
                          liveUserSeconds={member.user_id === currentUserId ? activeUserElapsedSeconds : null}
                        />
                      </div>
                      
                      {member.current_subject && member.status === 'studying' && (
                        <span className="text-zinc-400 text-xs truncate block mt-0.5">
                          {member.current_subject}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <FocusBadge score={member.focus_score} cameraEnabled={member.camera_enabled} />
                      
                      {isSharingCamera ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                          onClick={() => toggleCameraFeed(member.user_id)}
                          title={isMinimized ? "Expand live camera" : "Minimize live camera"}
                        >
                          <Video className="w-4 h-4" />
                        </Button>
                      ) : member.camera_enabled ? (
                        <Camera className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <CameraOff className="w-4 h-4 text-zinc-700" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Live Shared Camera Stream & Audio Clip */}
                {isSharingCamera && !isMinimized && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-zinc-800"
                  >
                    <div className="bg-zinc-950 rounded-lg aspect-video flex items-center justify-center relative overflow-hidden border border-zinc-800 shadow-inner">
                      {member.camera_frame_url ? (
                        <>
                          <img 
                            src={member.camera_frame_url} 
                            alt={`${member.user_name || 'Member'}'s camera`} 
                            className="w-full h-full object-cover transition-opacity duration-300" 
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>LIVE STREAM</span>
                          </div>
                          <div className="absolute bottom-1 right-2 text-[10px] text-zinc-400 bg-black/60 px-1.5 py-0.2 rounded">
                            Focus: {member.focus_score || 100}%
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-zinc-400 z-10 p-3">
                          <Video className="w-7 h-7 mx-auto mb-1.5 text-emerald-500 animate-pulse" />
                          <p className="text-xs font-medium text-zinc-300">{member.user_name || 'Member'} is sharing camera</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Connecting live stream...</p>
                        </div>
                      )}

                      {/* 10s Voice Audio Clip player if recently broadcasted */}
                      {member.audio_clip_url && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-zinc-950/90 border border-cyan-800/60 backdrop-blur-md px-2 py-1 rounded-md shadow-lg max-w-[85%]">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          <span className="text-[10px] text-cyan-300 font-medium truncate">10s Voice Note:</span>
                          <audio
                            src={member.audio_clip_url}
                            controls
                            className="h-5 w-32 focus:outline-none"
                            preload="none"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {members.length === 0 && (
          <div className="text-center py-8 text-zinc-600">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No members yet</p>
          </div>
        )}
      </div>
    </div>
  );
}