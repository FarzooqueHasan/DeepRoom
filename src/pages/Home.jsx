import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Users, ArrowRight, Clock, Shield, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { syncLocalToFirestore } from '@/firebase/firestore';

export default function Home() {
  const { user, openAuthModal, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [joinCode, setJoinCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  // Subscribe to real-time room updates and member status updates across browsers
  useEffect(() => {
    const unsubRoom = base44.entities.Room.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['myRooms'] });
    });
    const unsubMember = base44.entities.RoomMemberStatus.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['myRooms'] });
    });
    return () => {
      unsubRoom();
      unsubMember();
    };
  }, [queryClient]);

  const { data: myRooms = [], refetch: refetchRooms } = useQuery({
    queryKey: ['myRooms', user?.id, user?.email],
    queryFn: async () => {
      if (!user) return [];
      try {
        // Sync any local orphaned rooms from this browser to cloud
        await syncLocalToFirestore(user);

        const [allRooms, allStatuses] = await Promise.all([
          base44.entities.Room.list(),
          base44.entities.RoomMemberStatus.list().catch(() => []),
        ]);

        const userIdentifier = user.id;
        const userEmail = user.email?.toLowerCase();
        
        // Find all room IDs where user is an active/past member
        const memberRoomIds = new Set();
        (allStatuses || []).forEach(s => {
          const matchesId = s.user_id && s.user_id === userIdentifier;
          const matchesEmail = userEmail && s.user_email && s.user_email.toLowerCase() === userEmail;
          if ((matchesId || matchesEmail) && s.room_id) {
            memberRoomIds.add(s.room_id);
          }
        });

        return allRooms.filter(room => {
          // Check if user has a member status record for this room
          if (memberRoomIds.has(room.id)) return true;

          // Check by host ID or host Email
          if (room.host_id && room.host_id === userIdentifier) return true;
          if (userEmail && room.host_email && room.host_email.toLowerCase() === userEmail) {
            // Auto-adopt host_id if this room was created before signing in with permanent UID
            if (room.host_id !== userIdentifier) {
              base44.entities.Room.update(room.id, { host_id: userIdentifier }).catch(() => {});
            }
            return true;
          }
          
          // Check in members array (could be IDs or emails)
          const membersList = room.members || [];
          if (membersList.includes(userIdentifier)) return true;
          if (userEmail && membersList.some(m => typeof m === 'string' && m.toLowerCase() === userEmail)) return true;

          return false;
        });
      } catch (err) {
        console.warn('[Home] Failed to list rooms:', err);
        return [];
      }
    },
    enabled: !!(user?.id || user?.email),
    refetchInterval: 3000,
  });

  const { data: userStats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const stats = await base44.entities.UserStats.filter({ user_id: user.id });
        return stats[0] || null;
      } catch (err) {
        console.warn('[Home] Failed to load userStats:', err);
        return null;
      }
    },
    enabled: !!user?.id,
  });

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }
    if (!user) {
      toast.error('Please sign in to create a room');
      openAuthModal();
      return;
    }
    setIsCreating(true);
    try {
      const room = await base44.entities.Room.create({
        name: newRoomName.trim(),
        invite_code: generateInviteCode(),
        host_id: user.id,
        host_email: user.email,
        members: [user.id, user.email].filter(Boolean),
        is_shared_session: false,
        active_timer_type: 'none'
      });
      
      // Create initial member status
      await base44.entities.RoomMemberStatus.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        room_id: room.id,
        status: 'offline',
        last_active: new Date().toISOString()
      });
      
      setNewRoomName('');
      setCreateDialogOpen(false);
      refetchRooms();
      toast.success(`Room "${room.name}" created!`);
    } catch (err) {
      console.error('[Create Room Error]', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
        toast.error('Firestore Permission Denied. Please ensure your Firestore Security Rules allow authenticated read/write in Firebase Console.', { duration: 6000 });
      } else {
        toast.error(err?.message || 'Failed to create room. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }
    if (!user) {
      toast.error('Please sign in to join a room');
      openAuthModal();
      return;
    }
    setIsJoining(true);
    try {
      const rooms = await base44.entities.Room.filter({ invite_code: joinCode.trim().toUpperCase() });
      if (rooms.length > 0) {
        const room = rooms[0];
        const updatedMembers = Array.from(new Set([...(room.members || []), user.id, user.email].filter(Boolean)));
        await base44.entities.Room.update(room.id, {
          members: updatedMembers
        });
        
        // Create member status for new member
        await base44.entities.RoomMemberStatus.create({
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          room_id: room.id,
          status: 'offline',
          last_active: new Date().toISOString()
        });

        setJoinCode('');
        setJoinDialogOpen(false);
        refetchRooms();
        toast.success(`Joined room "${room.name}"!`);
      } else {
        toast.error('Room not found. Check the invite code and try again.');
      }
    } catch (err) {
      console.error('[Join Room Error]', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
        toast.error('Firestore Permission Denied. Check your Firestore Security Rules in Firebase Console.', { duration: 6000 });
      } else {
        toast.error(err?.message || 'Failed to join room.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const formatTime = (minutes) => {
    if (!minutes) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-light tracking-tight mb-2">
            Deep<span className="text-emerald-500">Room</span>
          </h1>
          <p className="text-zinc-500">Lock in. Focus. Emerge with proof.</p>
        </motion.div>

        {/* Stats Cards */}
        {userStats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
              <p className="text-2xl font-light">{formatTime(userStats.total_study_minutes)}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Study</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
              <Shield className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-light text-emerald-500">{formatTime(userStats.verified_focus_minutes)}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Verified Focus</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
              <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-light">{userStats.current_streak || 0}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Day Streak</p>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4 mb-8"
        >
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-14">
                <Plus className="w-5 h-5 mr-2" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle>Create Study Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="text-zinc-400">Room Name</Label>
                  <Input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. NEET Study Group"
                    className="bg-zinc-800 border-zinc-700 mt-2"
                  />
                </div>
                <Button
                  onClick={createRoom}
                  disabled={!newRoomName.trim() || isCreating}
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                >
                  {isCreating ? 'Creating...' : 'Create Room'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 border-zinc-700 hover:bg-zinc-800 h-14">
                <Users className="w-5 h-5 mr-2" />
                Join Room
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle>Join Study Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="text-zinc-400">Invite Code</Label>
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character code"
                    className="bg-zinc-800 border-zinc-700 mt-2 uppercase tracking-widest text-center text-lg"
                    maxLength={6}
                  />
                </div>
                <Button
                  onClick={joinRoom}
                  disabled={joinCode.length !== 6 || isJoining}
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                >
                  {isJoining ? 'Joining...' : 'Join Room'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* My Rooms */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-zinc-400 text-xs uppercase tracking-wider mb-4">My Rooms</h2>
          
          {myRooms.length === 0 ? (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-8 text-center">
              <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No rooms yet</p>
              <p className="text-zinc-600 text-sm mt-1">Create a room or join one with an invite code</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRooms.map((room) => (
                <Link
                  key={room.id}
                  to={createPageUrl(`StudyRoom?id=${room.id}`)}
                  className="block"
                >
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700 transition-colors"
                  >
                    <div>
                      <h3 className="font-medium text-zinc-100">{room.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {(room.members || []).length} members
                        </span>
                        <span className="text-zinc-700">•</span>
                        <span className="font-mono text-xs">{room.invite_code}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-zinc-600" />
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}