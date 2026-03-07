import { useEffect, useCallback, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

interface UseNavigationBlockerOptions {
  when: boolean;
  message?: string;
}

/**
 * Hook to block navigation when there are unsaved changes.
 * Works with:
 * - React Router navigation (sidebar, navbar, back arrow, bottom bar)
 * - Browser back/forward buttons
 * - Tab/window close
 * - Mobile back gesture
 */
export const useNavigationBlocker = ({
  when,
  message = 'Êtes-vous sûr de vouloir quitter ? Vos modifications seront perdues.',
}: UseNavigationBlockerOptions) => {
  const hasConfirmedRef = useRef(false);

  // Block React Router navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && 
      !hasConfirmedRef.current &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Handle browser beforeunload (close tab, browser back, refresh)
  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when, message]);

  // Confirm and proceed with navigation
  const confirmNavigation = useCallback(() => {
    hasConfirmedRef.current = true;
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  // Cancel navigation
  const cancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  // Reset confirmation state when blocker resets
  useEffect(() => {
    if (blocker.state === 'unblocked') {
      hasConfirmedRef.current = false;
    }
  }, [blocker.state]);

  return {
    isBlocked: blocker.state === 'blocked',
    confirmNavigation,
    cancelNavigation,
  };
};
