import React, { useRef, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Palette, RotateCcw, Download, Eraser, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = ['#10b981', '#f43f5e', '#38bdf8', '#fbbf24', '#ffffff', '#71717a'];

export default function SharedWhiteboard({ roomId, userId }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#10b981');
  const [lineWidth, setLineWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const queryClient = useQueryClient();

  // Load existing whiteboard data
  const { data: whiteboardRecord } = useQuery({
    queryKey: ['whiteboard', roomId],
    queryFn: async () => {
      if (!roomId) return null;
      const records = await base44.entities.WhiteboardData.filter({ room_id: roomId });
      return records[0] || null;
    },
    enabled: !!roomId,
  });

  useEffect(() => {
    if (whiteboardRecord) {
      setRecordId(whiteboardRecord.id);
      if (whiteboardRecord.drawing_data) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = whiteboardRecord.drawing_data;
      }
    }
  }, [whiteboardRecord]);

  // Subscribe to real-time whiteboard updates from peers
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = base44.entities.WhiteboardData.subscribe((event) => {
      if (event.data?.room_id === roomId && event.data?.last_updated_by !== userId) {
        if (event.data.drawing_data) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
          img.src = event.data.drawing_data;
        }
      }
    });
    return () => unsubscribe?.();
  }, [roomId, userId]);

  const saveCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !roomId) return;
    const dataUrl = canvas.toDataURL('image/png');

    if (recordId) {
      await base44.entities.WhiteboardData.update(recordId, {
        drawing_data: dataUrl,
        last_updated_by: userId || 'anonymous',
      });
    } else {
      const created = await base44.entities.WhiteboardData.create({
        room_id: roomId,
        drawing_data: dataUrl,
        last_updated_by: userId || 'anonymous',
      });
      setRecordId(created.id);
    }
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);

    ctx.strokeStyle = isEraser ? '#09090b' : color;
    ctx.lineWidth = isEraser ? lineWidth * 4 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveCanvas();
  };

  const clearCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveCanvas();
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `deeproom_whiteboard_${roomId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEraser(false)}
            className={`p-1.5 h-7 ${!isEraser ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400'}`}
          >
            <PenTool className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEraser(true)}
            className={`p-1.5 h-7 ${isEraser ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400'}`}
          >
            <Eraser className="w-3.5 h-3.5" />
          </Button>

          {/* Colors */}
          <div className="flex items-center gap-1 ml-1 border-l border-zinc-800 pl-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  setIsEraser(false);
                }}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  color === c && !isEraser ? 'scale-125 border-white' : 'border-zinc-700'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={clearCanvas}
            className="p-1.5 h-7 text-zinc-400 hover:text-zinc-200"
            title="Clear board"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={downloadCanvas}
            className="p-1.5 h-7 text-zinc-400 hover:text-zinc-200"
            title="Download PNG"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 aspect-[4/3] relative cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={600}
          height={450}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full block touch-none"
        />
      </div>
    </div>
  );
}
