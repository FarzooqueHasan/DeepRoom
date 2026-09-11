import React from 'react';
import { motion } from 'framer-motion';
import { Target, Clock, Calendar, CheckCircle, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';

const GOAL_LABELS = {
  study_minutes: 'Study Time',
  focus_minutes: 'Focus Time',
  sessions: 'Sessions',
  streak: 'Day Streak'
};

const GOAL_UNITS = {
  study_minutes: 'min',
  focus_minutes: 'min',
  sessions: '',
  streak: 'days'
};

export default function ChallengeCard({ challenge, progress, compact = false }) {
  const progressPercent = progress 
    ? Math.min((progress.current_progress / challenge.goal_value) * 100, 100)
    : 0;

  const isCompleted = progress?.is_completed || progressPercent >= 100;

  const getTypeIcon = () => {
    if (challenge.type === 'weekly') return <Calendar className="w-4 h-4" />;
    if (challenge.type === 'monthly') return <Calendar className="w-4 h-4" />;
    return <Trophy className="w-4 h-4" />;
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`p-3 rounded-lg border ${
          isCompleted
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-zinc-900/50 border-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className={`w-4 h-4 ${isCompleted ? 'text-emerald-500' : 'text-zinc-400'}`} />
            <span className="text-sm font-medium text-zinc-100">{challenge.title}</span>
          </div>
          {isCompleted && <CheckCircle className="w-4 h-4 text-emerald-500" />}
        </div>
        <Progress value={progressPercent} className="h-1 mb-1" />
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {progress?.current_progress || 0} / {challenge.goal_value} {GOAL_UNITS[challenge.goal_type]}
          </span>
          <span>+{challenge.points_reward} pts</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`p-4 rounded-xl border ${
        isCompleted
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-zinc-900/50 border-zinc-800'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className={`w-5 h-5 ${isCompleted ? 'text-emerald-500' : 'text-zinc-400'}`} />
            <h3 className="font-medium text-zinc-100">{challenge.title}</h3>
          </div>
          <p className="text-sm text-zinc-500">{challenge.description}</p>
        </div>
        {isCompleted && (
          <div className="bg-emerald-500/20 p-2 rounded-full">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-400">
              {GOAL_LABELS[challenge.goal_type]}: {progress?.current_progress || 0} / {challenge.goal_value} {GOAL_UNITS[challenge.goal_type]}
            </span>
            <span className="text-zinc-500">{Math.floor(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-zinc-500">
            {getTypeIcon()}
            <span className="capitalize">{challenge.type}</span>
          </div>
          {challenge.end_date && (
            <div className="flex items-center gap-1 text-zinc-500">
              <Clock className="w-3 h-3" />
              <span>Ends {formatDistanceToNow(new Date(challenge.end_date), { addSuffix: true })}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-yellow-500">
            <Trophy className="w-3 h-3" />
            <span>+{challenge.points_reward}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}