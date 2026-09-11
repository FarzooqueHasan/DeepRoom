import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Target, Clock, Check, X, Play, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';

export default function StudyBuddy({ roomId, userId, userName, members }) {
  const [buddyPairs, setBuddyPairs] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBuddy, setSelectedBuddy] = useState(null);
  const [sessionGoal, setSessionGoal] = useState('');
  const [targetMinutes, setTargetMinutes] = useState(60);

  useEffect(() => {
    loadBuddyPairs();
    const interval = setInterval(loadBuddyPairs, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  const loadBuddyPairs = async () => {
    const pairs = await base44.entities.StudyBuddyPair.filter({ room_id: roomId });
    setBuddyPairs(pairs);
  };

  const requestBuddy = async () => {
    if (!selectedBuddy || !sessionGoal.trim()) return;
    
    await base44.entities.StudyBuddyPair.create({
      room_id: roomId,
      user1_id: userId,
      user1_name: userName,
      user2_id: selectedBuddy,
      user2_name: members.find(m => m.user_id === selectedBuddy)?.user_name,
      status: 'pending',
      session_goal: sessionGoal,
      target_minutes: targetMinutes
    });
    
    setIsCreating(false);
    setSelectedBuddy(null);
    setSessionGoal('');
    await loadBuddyPairs();
  };

  const respondToBuddyRequest = async (pairId, accept) => {
    if (accept) {
      await base44.entities.StudyBuddyPair.update(pairId, {
        status: 'active',
        started_at: new Date().toISOString()
      });
    } else {
      await base44.entities.StudyBuddyPair.delete(pairId);
    }
    await loadBuddyPairs();
  };

  const completeBuddySession = async (pairId) => {
    await base44.entities.StudyBuddyPair.update(pairId, {
      status: 'completed',
      ended_at: new Date().toISOString()
    });
    await loadBuddyPairs();
  };

  const myPendingRequests = buddyPairs.filter(p => 
    p.user2_id === userId && p.status === 'pending'
  );

  const myActivePairs = buddyPairs.filter(p => 
    (p.user1_id === userId || p.user2_id === userId) && p.status === 'active'
  );

  const availableBuddies = members.filter(m => 
    m.user_id !== userId && 
    !buddyPairs.some(p => 
      (p.user1_id === userId && p.user2_id === m.user_id || 
       p.user2_id === userId && p.user1_id === m.user_id) && 
      p.status !== 'completed'
    )
  );

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Study Buddies
        </h3>
        
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-7">
              Find Buddy
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle>Request Study Buddy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Select a buddy</label>
                <div className="space-y-2">
                  {availableBuddies.map((member) => (
                    <button
                      key={member.user_id}
                      onClick={() => setSelectedBuddy(member.user_id)}
                      className={`w-full p-3 rounded-lg border transition-colors ${
                        selectedBuddy === member.user_id
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-zinc-800/30 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{member.user_name}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          member.status === 'studying' ? 'bg-emerald-500/20 text-emerald-400' :
                          member.status === 'break' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-zinc-700 text-zinc-500'
                        }`}>
                          {member.status}
                        </span>
                      </div>
                    </button>
                  ))}
                  
                  {availableBuddies.length === 0 && (
                    <p className="text-sm text-zinc-500 text-center py-4">
                      No available buddies right now
                    </p>
                  )}
                </div>
              </div>

              <Input
                placeholder="Session goal (e.g., Complete Chapter 5)"
                value={sessionGoal}
                onChange={(e) => setSessionGoal(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />

              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Target duration (minutes)</label>
                <Input
                  type="number"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(parseInt(e.target.value) || 60)}
                  className="bg-zinc-800 border-zinc-700"
                  min={15}
                  max={240}
                />
              </div>

              <Button
                onClick={requestBuddy}
                disabled={!selectedBuddy || !sessionGoal.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500"
              >
                Send Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Requests */}
      {myPendingRequests.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Buddy Requests
          </h4>
          <AnimatePresence>
            {myPendingRequests.map((pair) => (
              <motion.div
                key={pair.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 mb-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-zinc-100 mb-1">
                      <span className="font-medium">{pair.user1_name}</span> wants to study together
                    </p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {pair.session_goal}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {pair.target_minutes}m
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => respondToBuddyRequest(pair.id, true)}
                      className="h-7 bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => respondToBuddyRequest(pair.id, false)}
                      className="h-7 border-zinc-700"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Active Pairs */}
      {myActivePairs.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Active Sessions
          </h4>
          <AnimatePresence>
            {myActivePairs.map((pair) => {
              const buddyName = pair.user1_id === userId ? pair.user2_name : pair.user1_name;
              
              return (
                <motion.div
                  key={pair.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 mb-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-zinc-100 mb-1 flex items-center gap-2">
                        <Play className="w-3 h-3 text-emerald-500" />
                        Studying with <span className="font-medium">{buddyName}</span>
                      </p>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {pair.session_goal}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Target: {pair.target_minutes}m
                        </span>
                      </div>
                      {pair.started_at && (
                        <p className="text-xs text-zinc-600 mt-1">
                          Started {formatDistanceToNow(new Date(pair.started_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => completeBuddySession(pair.id)}
                      className="h-7 border-zinc-700"
                    >
                      <StopCircle className="w-3 h-3 mr-1" />
                      End
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {myPendingRequests.length === 0 && myActivePairs.length === 0 && (
        <div className="text-center py-8 text-zinc-600">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No active study buddy sessions</p>
          <p className="text-xs mt-1">Request a buddy to study together</p>
        </div>
      )}
    </div>
  );
}