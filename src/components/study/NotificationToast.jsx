import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { UserPlus, UserMinus, Play, Pause, Clock } from 'lucide-react';

export function useRoomNotifications(roomId, currentUserId) {
  useEffect(() => {
    if (!roomId) return;

    // Track previous member count
    let previousMembers = new Set();

    const unsubscribeMemberStatus = window.base44?.entities?.RoomMemberStatus?.subscribe((event) => {
      if (event.data.room_id !== roomId) return;
      if (event.data.user_id === currentUserId) return; // Don't notify for own actions

      const userName = event.data.user_name || 'Someone';

      if (event.type === 'create') {
        if (!previousMembers.has(event.data.user_id)) {
          toast(
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-500" />
              <span><strong>{userName}</strong> joined the room</span>
            </div>,
            { duration: 3000, position: 'top-center' }
          );
          previousMembers.add(event.data.user_id);
        }
      } else if (event.type === 'update') {
        const prevStatus = event.previous?.status;
        const newStatus = event.data.status;

        if (prevStatus !== newStatus) {
          if (newStatus === 'studying') {
            toast(
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-500" />
                <span><strong>{userName}</strong> started studying</span>
              </div>,
              { duration: 3000, position: 'top-center' }
            );
          } else if (newStatus === 'break') {
            toast(
              <div className="flex items-center gap-2">
                <Pause className="w-4 h-4 text-yellow-500" />
                <span><strong>{userName}</strong> is on break</span>
              </div>,
              { duration: 3000, position: 'top-center' }
            );
          } else if (newStatus === 'offline') {
            toast(
              <div className="flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-zinc-500" />
                <span><strong>{userName}</strong> went offline</span>
              </div>,
              { duration: 3000, position: 'top-center' }
            );
            previousMembers.delete(event.data.user_id);
          }
        }
      } else if (event.type === 'delete') {
        previousMembers.delete(event.data.user_id);
      }
    });

    return () => {
      unsubscribeMemberStatus?.();
    };
  }, [roomId, currentUserId]);
}

// Pomodoro notifications
export function usePomodoroNotifications(isSessionActive, timeRemaining) {
  useEffect(() => {
    if (!isSessionActive) return;

    if (timeRemaining === 300) { // 5 minutes left
      toast(
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-500" />
          <span>5 minutes remaining</span>
        </div>,
        { duration: 3000, position: 'top-center' }
      );
    } else if (timeRemaining === 60) { // 1 minute left
      toast(
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" />
          <span>1 minute remaining</span>
        </div>,
        { duration: 3000, position: 'top-center' }
      );
    }
  }, [isSessionActive, timeRemaining]);
}

export default { useRoomNotifications, usePomodoroNotifications };