import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AMBIENT_TRACKS = [
  { id: 'lofi', name: 'Lo-fi Beats', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
  { id: 'nature', name: 'Nature Sounds', url: 'https://stream.zeno.fm/8m3m8ak0k48uv' },
  { id: 'rain', name: 'Rain & Thunder', url: 'https://stream.zeno.fm/6jmzpv6pn48uv' },
  { id: 'piano', name: 'Calm Piano', url: 'https://stream.zeno.fm/f7wvbbqmdg8uv' },
  { id: 'cafe', name: 'Coffee Shop', url: 'https://stream.zeno.fm/hm1wfzb5k48uv' },
];

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState('lofi');
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume[0] / 100;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTrackChange = (trackId) => {
    setSelectedTrack(trackId);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  };

  const currentTrack = AMBIENT_TRACKS.find(t => t.id === selectedTrack);

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-4 h-4 text-zinc-400" />
        <h3 className="text-zinc-100 text-sm font-medium">Study Music</h3>
      </div>

      <audio ref={audioRef} preload="none">
        <source src={currentTrack?.url} type="audio/mpeg" />
      </audio>

      <div className="space-y-4">
        {/* Track Selector */}
        <Select value={selectedTrack} onValueChange={handleTrackChange}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {AMBIENT_TRACKS.map((track) => (
              <SelectItem 
                key={track.id} 
                value={track.id}
                className="text-zinc-100 focus:bg-zinc-800"
              >
                {track.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={togglePlay}
            className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>

          <div className="flex items-center gap-2 flex-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-400 hover:text-zinc-100"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="flex-1"
              disabled={isMuted}
            />
            <span className="text-xs text-zinc-500 w-8">{isMuted ? 0 : volume[0]}%</span>
          </div>
        </div>

        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-1"
          >
            <motion.div
              animate={{ scaleY: [1, 1.5, 1] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
              className="w-0.5 h-3 bg-emerald-500 rounded-full"
            />
            <motion.div
              animate={{ scaleY: [1, 2, 1] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }}
              className="w-0.5 h-3 bg-emerald-500 rounded-full"
            />
            <motion.div
              animate={{ scaleY: [1, 1.5, 1] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
              className="w-0.5 h-3 bg-emerald-500 rounded-full"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}