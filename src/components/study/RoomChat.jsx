import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function RoomChat({ roomId, currentUser }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['roomMessages', roomId],
    queryFn: async () => {
      const msgs = await base44.entities.RoomMessage.filter({ room_id: roomId }, '-created_date', 100);
      return msgs.reverse();
    },
    enabled: !!roomId,
    refetchInterval: 3000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = base44.entities.RoomMessage.subscribe((event) => {
      if (event.data.room_id === roomId) {
        queryClient.invalidateQueries({ queryKey: ['roomMessages', roomId] });
      }
    });
    return () => unsubscribe();
  }, [roomId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !currentUser || isSending) return;

    setIsSending(true);
    try {
      await base44.entities.RoomMessage.create({
        room_id: roomId,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        message: message.trim(),
        message_type: 'text'
      });
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 flex flex-col h-[500px]">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-zinc-400" />
        <h3 className="text-zinc-100 text-sm font-medium">Room Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.user_id === currentUser?.id ? 'items-end' : 'items-start'}`}
            >
              {msg.message_type === 'system' ? (
                <div className="text-xs text-zinc-500 text-center w-full py-1">
                  {msg.message}
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs text-zinc-400">
                      {msg.user_id === currentUser?.id ? 'You' : msg.user_name}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {format(new Date(msg.created_date || Date.now()), 'h:mm a')}
                    </span>
                  </div>
                  <div
                    className={`rounded-lg px-3 py-2 max-w-xs break-words ${
                      msg.user_id === currentUser?.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-800 text-zinc-100'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="bg-zinc-800 border-zinc-700 text-zinc-100 flex-1"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isSending}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}