import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Clock, Plus, Trash2, Tag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TaskManager({ roomId, userId, members = [] }) {
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['sharedTasks', roomId],
    queryFn: async () => {
      if (!roomId) return [];
      return base44.entities.SharedTask.filter({ room_id: roomId });
    },
    enabled: !!roomId,
  });

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = base44.entities.SharedTask.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['sharedTasks', roomId] });
    });
    return () => unsubscribe?.();
  }, [roomId, queryClient]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !roomId) return;

    await base44.entities.SharedTask.create({
      room_id: roomId,
      title: newTitle.trim(),
      status: 'todo',
      priority,
      assigned_to: userId ? [userId] : [],
    });

    setNewTitle('');
    queryClient.invalidateQueries({ queryKey: ['sharedTasks', roomId] });
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    await base44.entities.SharedTask.update(task.id, {
      status: nextStatus,
      completed_by: nextStatus === 'completed' ? userId : null,
      completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
    });
    queryClient.invalidateQueries({ queryKey: ['sharedTasks', roomId] });
  };

  const handleDeleteTask = async (taskId) => {
    await base44.entities.SharedTask.delete(taskId);
    queryClient.invalidateQueries({ queryKey: ['sharedTasks', roomId] });
  };

  const getPriorityStyle = (p) => {
    if (p === 'high') return 'text-rose-400 bg-rose-950/40 border-rose-800/40';
    if (p === 'medium') return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
    return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Room Tasks</h3>
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          {completedCount}/{tasks.length} done
        </span>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleAddTask} className="space-y-2">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Add task for this room..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500"
          />
          <Button
            type="submit"
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shrink-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500">Priority:</span>
          {['low', 'medium', 'high'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-2 py-0.5 rounded capitalize text-[11px] border transition-colors ${
                priority === p
                  ? getPriorityStyle(p)
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </form>

      {/* Tasks List */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="text-xs text-zinc-500 text-center py-4">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-lg">
            No tasks yet. Add a task to collaborate with room scholars.
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                task.status === 'completed'
                  ? 'bg-zinc-950/40 border-zinc-800/40 opacity-60'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div
                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                onClick={() => handleToggleStatus(task)}
              >
                {task.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-zinc-500 hover:text-emerald-400 shrink-0" />
                )}
                <span
                  className={`text-xs truncate ${
                    task.status === 'completed'
                      ? 'line-through text-zinc-500'
                      : 'text-zinc-200'
                  }`}
                >
                  {task.title}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded border font-mono shrink-0 capitalize ${getPriorityStyle(
                    task.priority
                  )}`}
                >
                  {task.priority || 'medium'}
                </span>
              </div>

              <button
                onClick={() => handleDeleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 p-1 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
