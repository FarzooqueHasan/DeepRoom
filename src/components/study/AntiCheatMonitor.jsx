import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Eye } from 'lucide-react';

export default function AntiCheatMonitor({ 
  isSessionActive, 
  onTabSwitch, 
  onInactivity,
  showWarnings = true 
}) {
  const [warning, setWarning] = useState(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const lastActivity = useRef(Date.now());
  const inactivityTimer = useRef(null);

  // Tab switch detection
  useEffect(() => {
    if (!isSessionActive) return;

    let tabSwitchStart = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchStart = Date.now();
      } else if (tabSwitchStart) {
        const duration = Date.now() - tabSwitchStart;
        if (duration > 10000) { // More than 10 seconds
          setTabSwitchCount(prev => prev + 1);
          onTabSwitch?.();
          setWarning('Tab switch detected for more than 10 seconds');
          setTimeout(() => setWarning(null), 5000);
        }
        tabSwitchStart = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSessionActive, onTabSwitch]);

  // Inactivity detection
  useEffect(() => {
    if (!isSessionActive) return;

    const resetActivity = () => {
      lastActivity.current = Date.now();
    };

    const checkInactivity = () => {
      const inactive = Date.now() - lastActivity.current > 180000; // 3 minutes
      if (inactive) {
        onInactivity?.();
        setWarning('No activity detected for 3+ minutes');
        setTimeout(() => setWarning(null), 5000);
      }
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('click', resetActivity);
    window.addEventListener('scroll', resetActivity);

    inactivityTimer.current = setInterval(checkInactivity, 30000);

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('click', resetActivity);
      window.removeEventListener('scroll', resetActivity);
      clearInterval(inactivityTimer.current);
    };
  }, [isSessionActive, onInactivity]);

  if (!showWarnings) return null;

  return (
    <>
      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/90 text-zinc-900 px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{warning}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isSessionActive && (
        <div className="fixed bottom-4 right-4 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-500" />
          <span className="text-xs text-zinc-400">Monitoring active</span>
          {tabSwitchCount > 0 && (
            <span className="text-xs text-yellow-500 ml-2">
              {tabSwitchCount} tab switch{tabSwitchCount > 1 ? 'es' : ''}
            </span>
          )}
        </div>
      )}
    </>
  );
}