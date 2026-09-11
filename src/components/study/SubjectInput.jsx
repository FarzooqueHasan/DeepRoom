import React from 'react';
import { BookOpen, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';

const SUBJECT_PRESETS = ['Mathematics', 'Computer Science', 'Language', 'Physics', 'Design', 'Reading'];

export default function SubjectInput({ value, onChange, isLocked }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>Study Goal / Subject</span>
        </div>
        {isLocked && (
          <div className="flex items-center gap-1 text-xs text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full">
            <Lock className="w-3 h-3" />
            <span>Locked during focus</span>
          </div>
        )}
      </div>

      <div className="relative">
        <Input
          type="text"
          placeholder="What are you mastering today? (e.g. Algorithms & Data Structures)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLocked}
          className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 pr-10"
        />
      </div>

      {!isLocked && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] text-zinc-500 mr-1">Quick Tags:</span>
          {SUBJECT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                value === preset
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-medium'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
