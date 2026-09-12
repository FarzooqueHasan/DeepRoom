import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Clock, Shield, Trophy, Flame, 
  Trash2, LogOut, LogIn, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { formatSessionDuration } from '@/lib/studySessions';

export default function Profile() {
  const { user, logout, openAuthModal, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: userStats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const stats = await base44.entities.UserStats.filter({ user_id: user.id });
      return stats[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['userSessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.StudySession.filter(
        { user_id: user.id }, 
        '-created_date', 
        20
      );
    },
    enabled: !!user?.id,
  });

  const formatTime = (minutes, seconds) => {
    const totalSecs =
      seconds !== undefined && seconds !== null
        ? Number(seconds)
        : Math.round((Number(minutes) || 0) * 60);
    return formatSessionDuration(totalSecs);
  };

  const deleteSession = async (sessionId) => {
    await base44.entities.StudySession.delete(sessionId);
    refetchSessions();
  };

  const deleteAllHistory = async () => {
    if (!user) return;
    const allSessions = await base44.entities.StudySession.filter({ user_id: user.id });
    for (const session of allSessions) {
      await base44.entities.StudySession.delete(session.id);
    }
    
    if (userStats) {
      await base44.entities.UserStats.update(userStats.id, {
        total_study_minutes: 0,
        verified_focus_minutes: 0,
        weekly_study_minutes: 0,
        weekly_verified_minutes: 0,
        current_streak: 0
      });
    }
    
    refetchSessions();
    queryClient.invalidateQueries({ queryKey: ['userStats'] });
  };

  const handleLogout = async () => {
    await logout();
  };

  const getFocusColor = (score) => {
    if (score >= 85) return 'text-emerald-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-medium">Profile</h1>
          </div>
          {isAuthenticated && user ? (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-zinc-400 hover:text-red-400"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <Button 
              size="sm"
              onClick={openAuthModal}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-medium"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {!isAuthenticated || !user ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center space-y-4 my-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700 mx-auto flex items-center justify-center text-zinc-400">
              <User className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-zinc-100">You are Signed Out</h2>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                Sign in to your DeepRoom account to view your study statistics, track streaks, and sync across devices.
              </p>
            </div>
            <Button
              onClick={openAuthModal}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold px-6 py-2.5 rounded-xl"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In / Register
            </Button>
          </motion.div>
        ) : (
          <>
            {/* User Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                  {user?.photo_url ? (
                    <img src={user.photo_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-zinc-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-medium">{user?.full_name || 'Scholar'}</h2>
                    {user?.is_anonymous && (
                      <span className="text-[11px] bg-amber-950/60 border border-amber-800/60 text-amber-400 px-2 py-0.5 rounded-full font-medium">
                        Guest
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-sm">{user?.email}</p>
                </div>
              </div>

              {/* Banner for Guest / Anonymous Users */}
              {user?.is_anonymous && (
                <div className="mt-4 flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
                  <div className="text-xs text-emerald-300">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Save Your Study History
                    </p>
                    <p className="text-emerald-400/80 mt-0.5">
                      You are using a temporary guest session. Sign in with Email or Google to save your profile permanently.
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={openAuthModal} 
                    className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs shrink-0 ml-3"
                  >
                    Link Account
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Stats */}
            {userStats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
              >
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <Clock className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
                  <p className="text-2xl font-light">
                    {formatTime(userStats.total_study_minutes, userStats.total_study_seconds)}
                  </p>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Study</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <Shield className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-light text-emerald-500">
                    {formatTime(userStats.verified_focus_minutes, userStats.verified_focus_seconds)}
                  </p>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Verified</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <Flame className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                  <p className="text-2xl font-light">{userStats.current_streak || 0}</p>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Day Streak</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-light">{userStats.reputation_score || 0}</p>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Reputation</p>
                </div>
              </motion.div>
            )}

            {/* Session History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                  Session History
                </h3>
                {sessions.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-300">
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Clear All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This will permanently delete all your study sessions and reset your stats.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={deleteAllHistory}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No completed sessions yet</p>
                  <p className="text-xs mt-1">Start a study session to track your progress</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {session.subject || 'Study Session'}
                          </span>
                          {session.ai_verified && (
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span>
                            {session.created_date && format(new Date(session.created_date), 'MMM d, h:mm a')}
                          </span>
                          <span>•</span>
                          <span>
                            {formatSessionDuration(
                              session.duration_seconds !== undefined && session.duration_seconds !== null
                                ? session.duration_seconds
                                : Math.round((session.duration_minutes || 0) * 60)
                            )}
                          </span>
                          <span>•</span>
                          <span className={getFocusColor(session.focus_score || 100)}>
                            {session.focus_score || 100}% focus
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSession(session.id)}
                        className="text-zinc-500 hover:text-red-400 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}