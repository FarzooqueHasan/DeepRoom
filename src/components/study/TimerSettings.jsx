import React from 'react';
import { Clock, Zap, Brain, Infinity as InfinityIcon, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PRESETS = [
  { id: 'pomodoro', label: 'Pomodoro', desc: '25 / 5', icon: Clock, work: 25 },
  { id: '50_10', label: '50/10', desc: '50 / 10', icon: Zap, work: 50 },
  { id: 'deep_work', label: 'Deep Work', desc: '90 / 15', icon: Brain, work: 90 },
  { id: 'continuous', label: 'Continuous', desc: 'No limit', icon: InfinityIcon, work: null },
];

export default function TimerSettings({ 
  selectedPreset, 
  onPresetChange, 
  customMinutes,
  onCustomChange 
}) {
  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <h3 className="text-zinc-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Timer Mode
      </h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <Button
              key={preset.id}
              variant="ghost"
              onClick={() => {
                onPresetChange(preset.id);
                onCustomChange(null);
              }}
              className={`flex flex-col items-center gap-1 h-auto py-3 ${
                selectedPreset === preset.id && !customMinutes
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
                  : 'bg-zinc-800/50 border border-transparent text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{preset.label}</span>
              <span className="text-[10px] opacity-60">{preset.desc}</span>
            </Button>
          );
        })}
      </div>

      <div className="pt-3 border-t border-zinc-800">
        <Label className="text-xs text-zinc-500">Custom Duration (minutes)</Label>
        <div className="flex gap-2 mt-2">
          <Input
            type="number"
            min={1}
            max={180}
            value={customMinutes || ''}
            onChange={(e) => {
              const val = parseInt(e.target.value) || null;
              onCustomChange(val);
              if (val) onPresetChange('custom');
            }}
            placeholder="e.g. 45"
            className="bg-zinc-800 border-zinc-700 text-zinc-100"
          />
          {customMinutes && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onCustomChange(null);
                onPresetChange('pomodoro');
              }}
              className="text-zinc-400 hover:text-red-400"
            >
              Clear
            </Button>
          )}
        </div>
        {customMinutes && (
          <p className="text-[10px] text-emerald-500 mt-1">
            Custom timer active: {customMinutes} min focus
          </p>
        )}
      </div>
    </div>
  );
}