import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import AppNavbar from './AppNavbar';
import BottomNavbar from './BottomNavbar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const AppLayout = ({ searchQuery, onSearchChange }: AppLayoutProps) => {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <AppNavbar
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />
        </header>
        <main className={`flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden ${isMobile ? 'pb-20' : ''}`}>
          <Outlet />
        </main>
      </SidebarInset>
      {isMobile && <BottomNavbar />}
    </SidebarProvider>
  );
};

export default AppLayout;
