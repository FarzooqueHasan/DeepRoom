import React from 'react';
import { motion } from 'framer-motion';
import { Award, Trophy, Flame, Star, Moon, Sun, Target, Zap } from 'lucide-react';

const BADGE_CONFIG = {
  first_session: { icon: Star, label: 'First Session', color: 'text-blue-400' },
  '10_hours': { icon: Award, label: '10 Hours', color: 'text-emerald-400' },
  '50_hours': { icon: Award, label: '50 Hours', color: 'text-emerald-500' },
  '100_hours': { icon: Trophy, label: '100 Hours', color: 'text-yellow-400' },
  '500_hours': { icon: Trophy, label: '500 Hours Legend', color: 'text-purple-400' },
  '7_day_streak': { icon: Flame, label: '7 Day Streak', color: 'text-orange-400' },
  '30_day_streak': { icon: Flame, label: '30 Day Streak', color: 'text-red-400' },
  '100_day_streak': { icon: Flame, label: '100 Day Warrior', color: 'text-red-500' },
  night_owl: { icon: Moon, label: 'Night Owl', color: 'text-indigo-400' },
  early_bird: { icon: Sun, label: 'Early Bird', color: 'text-yellow-300' },
  focus_master: { icon: Target, label: 'Focus Master', color: 'text-emerald-400' },
  marathon_runner: { icon: Zap, label: 'Marathon Runner', color: 'text-cyan-400' }
};

export default function BadgeDisplay({ badges, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((badge, index) => {
        const config = BADGE_CONFIG[badge.badge_type];
        if (!config) return null;
        
        const Icon = config.icon;
        
        return (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`${sizeClasses[size]} rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center group relative cursor-help`}
            title={config.label}
          >
            <Icon className={`${iconSizes[size]} ${config.color}`} />
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-xs whitespace-nowrap">
              {config.label}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}