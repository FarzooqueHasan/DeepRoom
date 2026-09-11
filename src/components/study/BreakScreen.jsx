import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coffee, Lightbulb, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

export default function BreakScreen({ onSkip, sessionData }) {
  const [focusTip, setFocusTip] = useState('');
  const [isLoadingTip, setIsLoadingTip] = useState(false);
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [showTaskInput, setShowTaskInput] = useState(false);

  useEffect(() => {
    generateFocusTip();
  }, []);

  const generateFocusTip = async () => {
    setIsLoadingTip(true);
    try {
      const prompt = `Generate a single, actionable focus tip for a student taking a study break. 
      Keep it concise (1-2 sentences), motivational, and practical. 
      Topics can include: hydration, stretching, eye exercises, breathing techniques, or quick mental resets.`;
      
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      setFocusTip(response);
    } catch (error) {
      setFocusTip('Remember to stay hydrated and stretch your body. Short walks help refresh your mind!');
    } finally {
      setIsLoadingTip(false);
    }
  };

  const handleSaveTasks = () => {
    if (sessionData && tasksCompleted.trim()) {
      const tasks = tasksCompleted
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      sessionData.tasks = tasks;
    }
    onSkip();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-zinc-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full space-y-6"
      >
        {/* Break Icon */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Coffee className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-light text-zinc-100">Break Time</h2>
          <p className="text-zinc-500 text-center text-sm">
            Take a moment to recharge your mind
          </p>
        </div>

        {/* Focus Tip */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-emerald-400 mb-1">Focus Tip</h3>
              {isLoadingTip ? (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating tip...</span>
                </div>
              ) : (
                <p className="text-sm text-zinc-300">{focusTip}</p>
              )}
            </div>
          </div>
        </div>

        {/* Task Completion (Optional) */}
        {!showTaskInput ? (
          <Button
            variant="outline"
            onClick={() => setShowTaskInput(true)}
            className="w-full text-sm border-zinc-700"
          >
            + Log completed tasks (optional)
          </Button>
        ) : (
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 flex items-center gap-2">
              <CheckCircle className="w-3 h-3" />
              What did you accomplish?
            </label>
            <Textarea
              value={tasksCompleted}
              onChange={(e) => setTasksCompleted(e.target.value)}
              placeholder="- Finished chapter 5&#10;- Completed practice problems&#10;- Reviewed notes"
              className="bg-zinc-800 border-zinc-700 text-sm min-h-[100px]"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onSkip}
            className="flex-1 border-zinc-700"
          >
            Skip
          </Button>
          <Button
            onClick={handleSaveTasks}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500"
          >
            Continue
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}