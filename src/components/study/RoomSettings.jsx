import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings2, Users, Shield, Bell, Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function RoomSettings({ 
  room, 
  isHost, 
  currentUserId,
  onUpdateRoom,
  onLeaveRoom,
  onDeleteRoom 
}) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [settings, setSettings] = useState({
    is_shared_session: room?.is_shared_session || false,
    require_camera: room?.require_camera || false,
    allow_breaks: room?.allow_breaks !== false,
  });

  const handleSave = async () => {
    await onUpdateRoom?.(settings);
    setOpen(false);
  };

  const handleLeave = async () => {
    await onLeaveRoom?.();
    setLeaveDialogOpen(false);
  };

  const handleDelete = async () => {
    await onDeleteRoom?.();
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100">
            <Settings2 className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Room Settings
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Room Info */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Room Info</Label>
              <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Name</span>
                  <span className="text-zinc-100">{room?.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Invite Code</span>
                  <span className="font-mono text-emerald-500">{room?.invite_code}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Members</span>
                  <span className="text-zinc-100">{room?.members?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Host Settings */}
            {isHost && (
              <div className="space-y-4">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Host Settings</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="shared-session" className="text-sm text-zinc-100">
                      Shared Timer
                    </Label>
                    <p className="text-xs text-zinc-500">
                      Synchronize timer for all members
                    </p>
                  </div>
                  <Switch
                    id="shared-session"
                    checked={settings.is_shared_session}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, is_shared_session: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="require-camera" className="text-sm text-zinc-100">
                      Require Camera
                    </Label>
                    <p className="text-xs text-zinc-500">
                      Members must enable camera tracking
                    </p>
                  </div>
                  <Switch
                    id="require-camera"
                    checked={settings.require_camera}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, require_camera: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow-breaks" className="text-sm text-zinc-100">
                      Allow Breaks
                    </Label>
                    <p className="text-xs text-zinc-500">
                      Members can take breaks during sessions
                    </p>
                  </div>
                  <Switch
                    id="allow-breaks"
                    checked={settings.allow_breaks}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, allow_breaks: checked }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Member Settings */}
            {!isHost && (
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Notifications</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications" className="text-sm text-zinc-100">
                      Room Notifications
                    </Label>
                    <p className="text-xs text-zinc-500">
                      Get notified about room activity
                    </p>
                  </div>
                  <Switch id="notifications" defaultChecked />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            {isHost && (
              <Button 
                variant="outline" 
                className="w-full border-zinc-700 hover:bg-zinc-800"
                onClick={handleSave}
              >
                Save Settings
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-400"
              onClick={() => setLeaveDialogOpen(true)}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
            
            {isHost && (
              <Button 
                variant="outline" 
                className="w-full border-red-900/50 hover:bg-red-900/20 text-red-500"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Room
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Confirmation */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Leave Room?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              You'll be removed from this room. You can rejoin later with the invite code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLeave}
              className="bg-zinc-700 hover:bg-zinc-600"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Delete Room?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete the room and remove all members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}