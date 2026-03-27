import {useEffect, useState} from 'react';
import {AccessibilityInfo} from 'react-native';

/**
 * Returns true when the user has enabled "Reduce Motion" in system settings.
 * Subscribes to changes so it stays in sync if the user toggles mid-session.
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  return reduceMotion;
}
