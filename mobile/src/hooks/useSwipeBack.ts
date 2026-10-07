import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { triggerLightHaptic } from '@/services/nativePolish';

export interface UseSwipeBackOptions {
  /**
   * Custom back action override. Defaults to router.back().
   */
  onBack?: () => void;
  /**
   * When true, disables gesture and hardware back navigation
   * (e.g., during active timed tests or breathing rounds).
   */
  disabled?: boolean;
}

/**
 * Hook for coordinating gesture and hardware back navigation per screen.
 * Handles Android BackHandler listeners and haptic feedback.
 */
export function useSwipeBack({ onBack, disabled = false }: UseSwipeBackOptions = {}) {
  const router = useRouter();

  const handleBack = () => {
    if (disabled) return;
    triggerLightHaptic();
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (disabled) {
        return true; // Consume event to prevent leaving protected screen
      }
      if (onBack) {
        handleBack();
        return true;
      }
      if (router.canGoBack()) {
        handleBack();
        return true;
      }
      return false;
    });

    return () => sub.remove();
  }, [disabled, onBack, router]);

  return {
    handleBack,
    isSwipeBackDisabled: disabled,
  };
}
