import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Shield, Flame, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatSessionDuration } from '@/lib/studySessions';

export default function Leaderboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: allStats = [] } = useQuery({
    queryKey: ['allStats'],
    queryFn: () => base44.entities.UserStats.list(),
  });

  const formatTime = (minutes, seconds) => {
    const totalSecs =
      seconds !== undefined && seconds !== null
        ? Number(seconds)
        : Math.round((Number(minutes) || 0) * 60);
    return formatSessionDuration(totalSecs);
  };

  const getMedalColor = (index) => {
    if (index === 0) return { bg: 'bg-yellow-500/20', text: 'text-yellow-500', border: 'border-yellow-500/30' };
    if (index === 1) return { bg: 'bg-zinc-400/20', text: 'text-zinc-400', border: 'border-zinc-400/30' };
    if (index === 2) return { bg: 'bg-amber-600/20', text: 'text-amber-600', border: 'border-amber-600/30' };
    return { bg: 'bg-zinc-800/50', text: 'text-zinc-500', border: 'border-zinc-800' };
  };

  const sortByDaily = (stats) => {
    return [...stats].sort((a, b) => {
      const aScore = (a.verified_focus_minutes || 0) * 1.2 + (a.total_study_minutes || 0);
      const bScore = (b.verified_focus_minutes || 0) * 1.2 + (b.total_study_minutes || 0);
      return bScore - aScore;
    });
  };

  const sortByWeekly = (stats) => {
    return [...stats].sort((a, b) => {
      const aScore = (a.weekly_verified_minutes || 0) * 1.2 + (a.weekly_study_minutes || 0);
      const bScore = (b.weekly_verified_minutes || 0) * 1.2 + (b.weekly_study_minutes || 0);
      return bScore - aScore;
    });
  };

  const sortByStreak = (stats) => {
    return [...stats].sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0));
  };

  const renderLeaderboard = (stats, type) => {
    let sortedStats;
    switch (type) {
      case 'weekly':
        sortedStats = sortByWeekly(stats);
        break;
      case 'streak':
        sortedStats = sortByStreak(stats);
        break;
      default:
        sortedStats = sortByDaily(stats);
    }

    return (
      <div className="space-y-3">
        {sortedStats.map((stat, index) => {
          const medal = getMedalColor(index);
          const isCurrentUser = stat.user_id === user?.id;

          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-xl border p-4 ${
                isCurrentUser 
                  ? 'bg-emerald-500/10 border-emerald-500/20' 
                  : index < 3 
                    ? `${medal.bg} ${medal.border}` 
                    : 'bg-zinc-900/50 border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${medal.bg}`}>
                  {index < 3 ? (
                    <Medal className={`w-5 h-5 ${medal.text}`} />
                  ) : (
                    <span className="text-lg font-semibold text-zinc-500">{index + 1}</span>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-medium text-zinc-100">
                    {stat.user_name || 'Anonymous'}
                    {isCurrentUser && <span className="text-zinc-500 ml-2">(you)</span>}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(
                        type === 'weekly' ? stat.weekly_study_minutes : stat.total_study_minutes,
                        type === 'weekly' ? stat.weekly_study_seconds : stat.total_study_seconds
                      )}
                    </span>
                    {stat.current_streak > 0 && (
                      <span className="flex items-center gap-1 text-orange-500">
                        <Flame className="w-3 h-3" />
                        {stat.current_streak} day streak
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {(stat.verified_focus_minutes > 0 || stat.weekly_verified_minutes > 0 || stat.verified_focus_seconds > 0) && (
                    <div className="flex items-center gap-1 text-emerald-500 justify-end">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">
                        {formatTime(
                          type === 'weekly' ? stat.weekly_verified_minutes : stat.verified_focus_minutes,
                          type === 'weekly' ? stat.weekly_verified_seconds : stat.verified_focus_seconds
                        )}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-zinc-600">verified focus</span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {sortedStats.length === 0 && (
          <div className="text-center py-12 text-zinc-600">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No activity recorded yet</p>
            <p className="text-sm mt-1">Start studying to appear on the leaderboard!</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h1 className="font-medium">Leaderboard</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="w-full bg-zinc-900 border border-zinc-800 mb-6">
            <TabsTrigger value="daily" className="flex-1">Today</TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1">This Week</TabsTrigger>
            <TabsTrigger value="streak" className="flex-1">Streaks</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            {renderLeaderboard(allStats, 'daily')}
          </TabsContent>

          <TabsContent value="weekly">
            {renderLeaderboard(allStats, 'weekly')}
          </TabsContent>

          <TabsContent value="streak">
            {renderLeaderboard(allStats, 'streak')}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}