import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Trophy, User } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const navItems = [
    { name: 'Home', icon: Home, page: 'Home' },
    { name: 'Leaderboard', icon: Trophy, page: 'Leaderboard' },
    { name: 'Profile', icon: User, page: 'Profile' },
  ];

  // Hide nav on study room for immersive experience
  const hideNav = currentPageName === 'StudyRoom';

  return (
    <div className="min-h-screen bg-zinc-950">
      <style>{`
        :root {
          --background: 9 9 11;
          --foreground: 244 244 245;
          --card: 24 24 27;
          --card-foreground: 244 244 245;
          --popover: 24 24 27;
          --popover-foreground: 244 244 245;
          --primary: 16 185 129;
          --primary-foreground: 255 255 255;
          --secondary: 39 39 42;
          --secondary-foreground: 244 244 245;
          --muted: 39 39 42;
          --muted-foreground: 161 161 170;
          --accent: 39 39 42;
          --accent-foreground: 244 244 245;
          --destructive: 239 68 68;
          --destructive-foreground: 255 255 255;
          --border: 39 39 42;
          --input: 39 39 42;
          --ring: 16 185 129;
        }
      `}</style>

      {children}

      {/* Bottom Navigation */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 pb-safe">
          <div className="max-w-lg mx-auto flex items-center justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'text-emerald-500' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Add padding for bottom nav */}
      {!hideNav && <div className="h-20" />}
    </div>
  );
}