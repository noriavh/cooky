import { Bell, Check, Users, ChefHat, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { usePendingRequestsCount } from '@/hooks/useCookiers';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  Notification,
} from '@/hooks/useNotifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'friend_accepted':
      return <Users className="w-4 h-4 text-primary" />;
    case 'recipes_shared':
      return <ChefHat className="w-4 h-4 text-accent-foreground" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const NotificationItem = ({
  notification,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: () => void;
}) => {
  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    onNavigate();
  };

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-3 hover:bg-accent/50 cursor-pointer transition-colors',
        !notification.read && 'bg-accent/20'
      )}
      onClick={handleClick}
    >
      <div className="mt-0.5 shrink-0">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className={cn('text-sm truncate', !notification.read && 'font-medium')}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground truncate">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: fr,
          })}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { data: pendingCount } = usePendingRequestsCount();
  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const totalBadgeCount = (pendingCount || 0) + (unreadCount || 0);

  const handleNavigate = () => {
    navigate('/cookiers');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {totalBadgeCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
              {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-2" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {(unreadCount ?? 0) > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              <Check className="w-3 h-3 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {/* Pending friend requests section */}
          {(pendingCount ?? 0) > 0 && (
            <div
              className="flex items-center gap-2 p-3 hover:bg-accent/50 cursor-pointer transition-colors bg-primary/10 border-b"
              onClick={() => navigate('/cookiers')}
            >
              <Users className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {pendingCount} demande{(pendingCount ?? 0) > 1 ? 's' : ''} en attente
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Cliquez pour voir vos demandes de cookiers
                </p>
              </div>
            </div>
          )}

          {/* Notifications list */}
          {notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markRead.mutate(id)}
                  onDelete={(id) => deleteNotification.mutate(id)}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          ) : (
            (pendingCount ?? 0) === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Aucune notification
              </div>
            )
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
