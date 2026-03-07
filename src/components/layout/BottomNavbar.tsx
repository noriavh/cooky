import { Link, useLocation } from 'react-router-dom';
import { ChefHat, FolderHeart, ShoppingCart, CalendarDays, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Recettes',
    href: '/recipes',
    icon: ChefHat,
  },
  {
    label: 'Inspiration',
    href: '/inspiration',
    icon: Sparkles,
  },
  {
    label: 'Semaine',
    href: '/meal-planning',
    icon: CalendarDays,
  },
  {
    label: 'Courses',
    href: '/shopping',
    icon: ShoppingCart,
  },
];

const BottomNavbar = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className={cn(
                "text-xs font-medium",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavbar;
