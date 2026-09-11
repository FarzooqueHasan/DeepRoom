import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, Clock, Shield, Star, Medal } from 'lucide-react';

export default function LeaderboardCard({ stats = [], title, type = 'daily', currentUserId }) {
  const calculateScore = (stat, scoreType) => {
    if (scoreType === 'daily') {
      const verifiedPoints = (stat.verified_focus_minutes || 0) * 2;
      const studyPoints = (stat.total_study_minutes || 0);
      const sessionBonus = (stat.total_sessions || 0) * 50;
      return verifiedPoints + studyPoints + sessionBonus;
    } else if (scoreType === 'weekly') {
      const verifiedPoints = (stat.weekly_verified_minutes || 0) * 2;
      const studyPoints = (stat.weekly_study_minutes || 0);
      const streakBonus = (stat.current_streak || 0) * 100;
      return verifiedPoints + studyPoints + streakBonus;
    } else {
      return (stat.current_streak || 0) * 1000 + (stat.total_points || 0);
    }
  };

  const sortedStats = [...stats].sort((a, b) => {
    return calculateScore(b, type) - calculateScore(a, type);
  }).slice(0, 5);

  const formatTime = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const getMedalColor = (index) => {
    if (index === 0) return { bg: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-500', text: 'text-yellow-500' };
    if (index === 1) return { bg: 'bg-zinc-400/20 border-zinc-400/30 text-zinc-300', text: 'text-zinc-300' };
    if (index === 2) return { bg: 'bg-amber-600/20 border-amber-600/30 text-amber-600', text: 'text-amber-600' };
    return { bg: 'bg-zinc-800 text-zinc-500', text: 'text-zinc-500' };
  };

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-zinc-400 text-xs uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          {title}
        </h3>
      </div>

      <div className="space-y-2">
        {sortedStats.map((stat, index) => (
          <motion.div
            key={stat.user_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center justify-between p-3 rounded-lg ${
              stat.user_id === currentUserId
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-zinc-800/30'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium border ${getMedalColor(index).bg}`}>
                {index < 3 ? <Medal className="w-4 h-4" /> : index + 1}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium truncate ${stat.user_id === currentUserId ? 'text-emerald-400' : 'text-zinc-100'}`}>
                    {stat.user_name || 'Anonymous'}
                  </span>
                  {stat.level && stat.level > 1 && (
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                      Lv{stat.level}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    {Math.floor(calculateScore(stat, type)).toLocaleString()}
                  </span>
                  {type !== 'streak' && (
                    <>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(type === 'weekly' ? stat.weekly_study_minutes : stat.total_study_minutes)}
                      </span>
                    </>
                  )}
                  {stat.current_streak > 0 && (
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500" />
                      {stat.current_streak}d
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(stat.verified_focus_minutes > 0 || stat.weekly_verified_minutes > 0) && (
              <div className="flex items-center gap-1 text-emerald-500">
                <Shield className="w-3 h-3" />
                <span className="text-xs">
                  {formatTime(type === 'weekly' ? stat.weekly_verified_minutes : stat.verified_focus_minutes)}
                </span>
              </div>
            )}
          </motion.div>
        ))}

        {sortedStats.length === 0 && (
          <div className="text-center py-6 text-zinc-600">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activity yet</p>
          </div>
        )}
      </div>
    </div>
  );
}