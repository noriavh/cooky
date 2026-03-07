import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import NotificationBell from './NotificationBell';

interface AppNavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const AppNavbar = ({ searchQuery, onSearchChange }: AppNavbarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Cookier';
  const initials = username.substring(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex items-center justify-between">
      {/* Center: Search (desktop) */}
      <div className="hidden md:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher une recette..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Right: User info */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Mobile search toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
        >
          {showMobileSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </Button>

        <NotificationBell />
        
        {/* Clickable profile */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Avatar className="w-8 h-8 bg-primary">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-sm font-medium text-foreground">
            {username}
          </span>
        </button>
      </div>

      {/* Mobile search bar */}
      {showMobileSearch && (
        <div className="absolute left-0 right-0 top-14 md:hidden px-4 py-3 bg-background border-b">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher une recette..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AppNavbar;
