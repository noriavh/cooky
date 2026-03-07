import { ChefHat, List, ShoppingCart, Package, Users, User, LogOut, CalendarDays, Sparkles, Globe, AlignJustify, Star, BookOpen, Leaf } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useUserRole';
import { useIsMobile } from '@/hooks/use-mobile';
import cookyLogo from '@/assets/cooky-logo.png';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

const cuisinerItems = [
  { icon: ChefHat, label: 'Mes Recettes', path: '/recipes' },
  { icon: Sparkles, label: 'Inspiration', path: '/inspiration' },
  { icon: List, label: 'Mes Listes', path: '/lists' },
  { icon: Leaf, label: 'De saison', path: '/seasonal-products' },
];

const planifierItems = [
  { icon: CalendarDays, label: 'Ma semaine', path: '/meal-planning' },
  { icon: ShoppingCart, label: 'Liste de courses', path: '/shopping' },
];

const administrationItems = [
  { icon: Package, label: 'Produits', path: '/shopping/products' },
  { icon: Star, label: 'Mes essentiels', path: '/shopping/essentials' },
  { icon: AlignJustify, label: 'Mes rayons', path: '/aisle-orders' },
  { icon: Users, label: 'Mes Cookiers', path: '/cookiers' },
];

const adminOnlyItems = [
  { icon: Globe, label: 'Produits globaux', path: '/global-products' },
];

const AppSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleMenuClick = () => {
    // Close the mobile sidebar when clicking a menu item
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path || 
      (path === '/recipes' && location.pathname.startsWith('/recipes'));
  };

  const renderMenuItems = (items: typeof cuisinerItems) => (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = isActiveRoute(item.path);
        return (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.label}
            >
              <NavLink
                to={item.path}
                onClick={handleMenuClick}
                className={cn(
                  "flex items-center gap-3",
                  isActive && "text-primary"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar>
      {/* Logo */}
      <SidebarHeader className="p-4">
        <NavLink to="/recipes" className="flex items-center gap-3">
          <img src={cookyLogo} alt="Cooky" className="w-10 h-10" />
          <span className="text-xl font-display font-bold text-gradient">Cooky</span>
        </NavLink>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent>
        {/* Cuisiner Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Cuisiner
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(cuisinerItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Planifier Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Planifier
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(planifierItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Administration Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(administrationItems)}
            {isAdmin && renderMenuItems(adminOnlyItems)}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      {/* User section */}
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === '/guide'}
              tooltip="Guide"
            >
              <NavLink to="/guide" onClick={handleMenuClick} className="flex items-center gap-3">
                <BookOpen className="w-5 h-5" />
                <span>Guide</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === '/profile'}
              tooltip="Mon Profil"
            >
              <NavLink to="/profile" onClick={handleMenuClick} className="flex items-center gap-3">
                <User className="w-5 h-5" />
                <span>Mon Profil</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSignOut();
              }}
              tooltip="Déconnexion"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
