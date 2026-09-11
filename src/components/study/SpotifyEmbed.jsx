import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function SpotifyEmbed({ room, isHost }) {
  const [spotifyUrl, setSpotifyUrl] = useState(room?.shared_spotify_uri || '');
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const extractSpotifyId = (url) => {
    // Extract Spotify track/playlist ID from URL
    const match = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
    return match ? { type: match[1], id: match[2] } : null;
  };

  const handleSetSpotify = async () => {
    if (!room || !isHost) return;
    
    const spotifyData = extractSpotifyId(spotifyUrl);
    if (!spotifyData) {
      alert('Please enter a valid Spotify URL');
      return;
    }

    await base44.entities.Room.update(room.id, {
      shared_spotify_enabled: true,
      shared_spotify_uri: `spotify:${spotifyData.type}:${spotifyData.id}`
    });
    queryClient.invalidateQueries({ queryKey: ['room', room.id] });
  };

  const handleClearSpotify = async () => {
    if (!room || !isHost) return;
    await base44.entities.Room.update(room.id, {
      shared_spotify_enabled: false,
      shared_spotify_uri: null
    });
    setSpotifyUrl('');
    queryClient.invalidateQueries({ queryKey: ['room', room.id] });
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Room.update(room.id, {
        shared_spotify_enabled: true,
        shared_spotify_uri: file_url
      });
      queryClient.invalidateQueries({ queryKey: ['room', room.id] });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload audio');
    } finally {
      setIsUploading(false);
    }
  };

  const getEmbedUrl = (uri) => {
    if (!uri) return null;
    if (uri.startsWith('http')) return null; // Uploaded audio
    const parts = uri.split(':');
    if (parts.length !== 3) return null;
    return `https://open.spotify.com/embed/${parts[1]}/${parts[2]}`;
  };

  const embedUrl = getEmbedUrl(room?.shared_spotify_uri);
  const isUploadedAudio = room?.shared_spotify_uri?.startsWith('http');

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-4 h-4 text-emerald-400" />
        <h3 className="text-zinc-100 text-sm font-medium">Room Music</h3>
      </div>

      {isHost ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Spotify Link</label>
            <div className="flex gap-2">
              <Input
                placeholder="Paste Spotify track/playlist URL"
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" onClick={handleSetSpotify}>
                Set
              </Button>
            </div>
          </div>

          <div className="text-center text-xs text-zinc-500">or</div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Upload Audio</label>
            <label className="cursor-pointer">
              <div className="border border-dashed border-zinc-700 rounded-lg p-4 hover:border-emerald-500 transition-colors">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5 text-zinc-500" />
                  <span className="text-xs text-zinc-500">
                    {isUploading ? 'Uploading...' : 'Click to upload MP3'}
                  </span>
                </div>
              </div>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>

          {room?.shared_spotify_enabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSpotify}
              className="w-full text-xs text-red-400"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Clear Music
            </Button>
          )}
        </div>
      ) : (
        <div className="text-center text-xs text-zinc-500 py-2">
          {room?.shared_spotify_enabled ? 'Host controls music' : 'No music set'}
        </div>
      )}

      {room?.shared_spotify_enabled && (
        <div className="mt-4">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
            />
          ) : isUploadedAudio ? (
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <audio
                src={room.shared_spotify_uri}
                controls
                className="w-full"
                autoPlay
                loop
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}