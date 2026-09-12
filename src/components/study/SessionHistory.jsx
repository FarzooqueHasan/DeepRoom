import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, BookOpen, Shield, FileText, ChevronDown, ChevronUp, CheckCircle, TrendingUp, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { formatSessionDuration } from '@/lib/studySessions';

export default function SessionHistory({ sessions = [] }) {
  const [expandedSession, setExpandedSession] = useState(null);
  
  const completedSessions = [...sessions].filter(s => s.status === 'completed');
  const sortedSessions = [...completedSessions]
    .sort((a, b) => new Date(b.end_time) - new Date(a.end_time))
    .slice(0, 10);

  const getFocusColor = (score) => {
    if (score >= 85) return 'text-emerald-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Aggregate top subjects by exact seconds
  const subjectMap = {};
  completedSessions.forEach(s => {
    const subj = s.subject || 'General Study';
    const durSecs = s.duration_seconds !== undefined && s.duration_seconds !== null
      ? Number(s.duration_seconds)
      : Math.round(Number(s.duration_minutes || 0) * 60);
    subjectMap[subj] = (subjectMap[subj] || 0) + durSecs;
  });
  const topSubjects = Object.entries(subjectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const totalStudySeconds = completedSessions.reduce((sum, s) => {
    const dur = s.duration_seconds !== undefined && s.duration_seconds !== null
      ? Number(s.duration_seconds)
      : Math.round(Number(s.duration_minutes || 0) * 60);
    return sum + dur;
  }, 0);
  const totalBreakSeconds = completedSessions.reduce((sum, s) => sum + Math.round(Number(s.break_duration_minutes || 0) * 60), 0);

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <h3 className="text-zinc-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Recent Sessions
      </h3>

      {/* Summary Stats */}
      {completedSessions.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="bg-zinc-800/30 rounded-lg p-2">
            <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
              <Clock className="w-3 h-3" />
              Total Study
            </div>
            <p className="text-sm text-zinc-100 font-medium">{formatSessionDuration(totalStudySeconds)}</p>
          </div>
          <div className="bg-zinc-800/30 rounded-lg p-2">
            <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
              <Coffee className="w-3 h-3" />
              Total Breaks
            </div>
            <p className="text-sm text-zinc-100 font-medium">{formatSessionDuration(totalBreakSeconds)}</p>
          </div>
        </div>
      )}

      {/* Top Subjects */}
      {topSubjects.length > 0 && (
        <div className="mb-4 bg-zinc-800/30 rounded-lg p-3">
          <div className="flex items-center gap-1 text-xs text-zinc-500 mb-2">
            <TrendingUp className="w-3 h-3" />
            Top Subjects
          </div>
          <div className="space-y-1">
            {topSubjects.map(([subject, secs], i) => (
              <div key={subject} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 flex items-center gap-1">
                  <span className="text-zinc-600">{i + 1}.</span>
                  {subject}
                </span>
                <span className="text-zinc-500">{formatSessionDuration(secs)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedSessions.map((session, index) => {
          const isExpanded = expandedSession === session.id;
          const sessionSecs =
            session.duration_seconds !== undefined && session.duration_seconds !== null
              ? Number(session.duration_seconds)
              : Math.round(Number(session.duration_minutes || 0) * 60);
          
          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-lg bg-zinc-800/30 overflow-hidden"
            >
              <div 
                className="p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                onClick={() => setExpandedSession(isExpanded ? null : session.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                      <span className="text-sm text-zinc-100 truncate">
                        {session.subject || 'Study Session'}
                      </span>
                      {session.points_earned > 0 && (
                        <span className="text-xs text-yellow-500">+{session.points_earned}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatSessionDuration(sessionSecs)}
                      </span>
                      
                      {session.camera_enabled && session.focus_score && (
                        <span className={`flex items-center gap-1 ${getFocusColor(session.focus_score)}`}>
                          <Shield className="w-3 h-3" />
                          {session.focus_score}%
                        </span>
                      )}

                      {session.breaks_taken > 0 && (
                        <span className="flex items-center gap-1">
                          <span>☕</span>
                          {session.breaks_taken}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-zinc-600 mt-1">
                      {format(new Date(session.end_time), 'MMM d, h:mm a')}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-500"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-zinc-800"
                  >
                    <div className="p-3 space-y-3">
                      {/* AI Summary */}
                      {session.ai_summary && (
                        <div className="bg-zinc-800/50 rounded p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <FileText className="w-3 h-3 text-emerald-400" />
                            <span className="text-xs font-medium text-emerald-400">AI Summary</span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed">{session.ai_summary}</p>
                        </div>
                      )}

                      {/* Tasks Completed */}
                      {session.tasks_completed && session.tasks_completed.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <CheckCircle className="w-3 h-3 text-zinc-400" />
                            <span className="text-xs font-medium text-zinc-400">Tasks Completed</span>
                          </div>
                          <ul className="space-y-1">
                            {session.tasks_completed.map((task, i) => (
                              <li key={i} className="text-xs text-zinc-400 pl-3">• {task}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {session.break_duration_minutes > 0 && (
                          <div className="text-zinc-500">
                            Break Time: {formatSessionDuration(Math.round((session.break_duration_minutes || 0) * 60))}
                          </div>
                        )}
                        {session.tab_switches > 0 && (
                          <div className="text-zinc-500">
                            Tab Switches: {session.tab_switches}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        
        {sortedSessions.length === 0 && (
          <div className="text-center py-8 text-zinc-600">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No completed sessions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}