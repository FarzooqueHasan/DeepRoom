import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Play, Square } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function SyncTimerControl({ room, isHost, timerPreset, customMinutes }) {
  const [isStarting, setIsStarting] = useState(false);
  const queryClient = useQueryClient();

  const TIMER_PRESETS = {
    pomodoro: 25,
    '50_10': 50,
    deep_work: 90,
    continuous: 480,
  };

  const handleStartSync = async () => {
    if (!isHost || !room) return;
    
    setIsStarting(true);
    const duration = customMinutes || TIMER_PRESETS[timerPreset] || 25;
    
    await base44.entities.Room.update(room.id, {
      is_shared_session: true,
      active_timer_type: timerPreset,
      timer_started_at: new Date().toISOString(),
      timer_duration_minutes: duration
    });
    
    queryClient.invalidateQueries({ queryKey: ['room', room.id] });
    setIsStarting(false);
  };

  const handleStopSync = async () => {
    if (!isHost || !room) return;
    
    await base44.entities.Room.update(room.id, {
      is_shared_session: false,
      active_timer_type: 'none',
      timer_started_at: null,
      timer_duration_minutes: null
    });
    
    queryClient.invalidateQueries({ queryKey: ['room', room.id] });
  };

  if (!isHost) {
    if (room?.is_shared_session) {
      return (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
          <p className="text-xs text-emerald-400">Synchronized Timer Active</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2">
      {room?.is_shared_session ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleStopSync}
          className="w-full text-xs border-red-400/20 text-red-400 hover:bg-red-400/10"
        >
          <Square className="w-3 h-3 mr-2" />
          Stop Synchronized Timer
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={handleStartSync}
          disabled={isStarting}
          className="w-full text-xs bg-emerald-600 hover:bg-emerald-500"
        >
          <Play className="w-3 h-3 mr-2" />
          Start Synchronized Timer
        </Button>
      )}
      <p className="text-xs text-zinc-500 text-center">
        {room?.is_shared_session 
          ? 'All members share the same timer' 
          : 'Sync timer for all members (Host only)'}
      </p>
    </div>
  );
}