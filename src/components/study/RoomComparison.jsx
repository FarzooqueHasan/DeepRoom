import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, BarChart3, Calendar, Clock, Medal, Flame } from 'lucide-react';
import {
  calculateUserAggregates,
  formatCardDuration,
  formatSessionDuration,
  getLocalDateString,
} from '@/lib/studySessions';

const MEMBER_COLORS = [
  '#10b981', // Emerald (current user)
  '#38bdf8', // Sky
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
];

export default function RoomComparison({
  members = [],
  allSessions = [],
  currentUserId,
}) {
  const [activeTab, setActiveTab] = useState('bars'); // 'daily' | 'weekly' | 'monthly' | 'bars'

  // Calculate aggregates for all members in this room
  const memberComparisonData = useMemo(() => {
    return members.map((member, index) => {
      const isYou = member.user_id === currentUserId;
      const memberSessions = allSessions.filter(
        (s) =>
          s.user_id === member.user_id ||
          (member.user_email && s.user_email?.toLowerCase() === member.user_email?.toLowerCase())
      );

      const aggregates = calculateUserAggregates(memberSessions);
      const color = isYou ? MEMBER_COLORS[0] : MEMBER_COLORS[(index + 1) % MEMBER_COLORS.length];

      return {
        userId: member.user_id,
        name: member.user_name || member.user_email?.split('@')[0] || 'Member',
        isYou,
        todaySeconds: aggregates.todaySeconds,
        weekSeconds: aggregates.weekSeconds,
        monthSeconds: aggregates.monthSeconds,
        streakDays: aggregates.streakDays,
        totalSessions: aggregates.totalSessions,
        last7Days: aggregates.last7Days,
        color,
      };
    });
  }, [members, allSessions, currentUserId]);

  // Sort list for ranking tables
  const sortedMembers = useMemo(() => {
    const list = [...memberComparisonData];
    list.sort((a, b) => {
      if (activeTab === 'daily') {
        return (b.todaySeconds || 0) - (a.todaySeconds || 0);
      }
      if (activeTab === 'monthly') {
        return (b.monthSeconds || 0) - (a.monthSeconds || 0);
      }
      return (b.weekSeconds || 0) - (a.weekSeconds || 0);
    });
    return list;
  }, [memberComparisonData, activeTab]);

  // Calculate maximum hours for 7-Day bar chart scaling
  const maxHours = useMemo(() => {
    let max = 3;
    memberComparisonData.forEach((m) => {
      (m.last7Days || []).forEach((d) => {
        if (d.hours > max) max = Math.ceil(d.hours);
      });
    });
    return Math.max(3, max);
  }, [memberComparisonData]);

  const daysLabels = memberComparisonData[0]?.last7Days || [];

  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5 shadow-xl">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">
            Room Comparison
          </h3>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1 bg-zinc-950/70 p-1 rounded-xl border border-zinc-800/80 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('bars')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'bars'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            7-Day Bars
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'daily'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weekly')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'weekly'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'monthly'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* 1. 7-Day Comparison Bars View */}
      {activeTab === 'bars' && (
        <div>
          <div className="relative w-full h-56 flex flex-col justify-end pt-2 pb-1">
            {/* Gridlines */}
            <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
              {[maxHours, Math.round(maxHours * 0.66), Math.round(maxHours * 0.33), 0].map((h, i) => (
                <div key={i} className="flex items-center w-full">
                  <span className="text-[10px] text-zinc-600 w-6 text-left font-mono">{h}h</span>
                  <div className="flex-1 border-b border-zinc-800/40 border-dashed ml-1" />
                </div>
              ))}
            </div>

            {/* Bars */}
            <div className="relative pl-8 pr-1 flex items-end justify-between h-44 z-10">
              {daysLabels.map((day, dayIdx) => (
                <div key={day.dateKey} className="flex-1 flex flex-col items-center h-full justify-end">
                  <div className="flex items-end gap-1 h-full justify-center w-full max-w-[48px]">
                    {memberComparisonData.map((member) => {
                      const memberDay = member.last7Days[dayIdx];
                      const hours = memberDay?.hours || 0;
                      const heightPct = Math.min(100, Math.max(hours > 0 ? 6 : 0, (hours / maxHours) * 100));

                      return (
                        <div
                          key={member.userId}
                          className="flex-1 rounded-t-sm transition-all relative group cursor-pointer"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: member.color,
                            minWidth: '6px',
                          }}
                        >
                          {/* Tooltip */}
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                            {member.name}: {formatSessionDuration(memberDay?.seconds || 0)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-2 font-mono whitespace-nowrap">
                    {day.dayLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Member Color Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-zinc-800/60 text-xs">
            {memberComparisonData.map((member) => (
              <div key={member.userId} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: member.color }} />
                <span className={`text-xs ${member.isYou ? 'text-emerald-400 font-medium' : 'text-zinc-400'}`}>
                  {member.name} {member.isYou && '(you)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Ranked Table for Daily, Weekly, Monthly */}
      {activeTab !== 'bars' && (
        <div className="space-y-2">
          {sortedMembers.map((member, idx) => {
            const timeVal =
              activeTab === 'daily'
                ? member.todaySeconds
                : activeTab === 'monthly'
                ? member.monthSeconds
                : member.weekSeconds;

            return (
              <motion.div
                key={member.userId}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  member.isYou
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : idx === 1
                        ? 'bg-zinc-400/20 text-zinc-300 border border-zinc-400/30'
                        : idx === 2
                        ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                        : 'text-zinc-500'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-zinc-100">
                      {member.name}
                    </span>
                    {member.isYou && <span className="text-xs text-emerald-400 ml-1.5">(you)</span>}
                    {member.streakDays > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-orange-400 mt-0.5 font-mono">
                        <Flame className="w-2.5 h-2.5" />
                        {member.streakDays}d streak
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono font-medium text-sm text-zinc-100">
                  {formatCardDuration(timeVal)}
                </div>
              </motion.div>
            );
          })}

          {sortedMembers.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500">
              No study data recorded yet for this period.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
