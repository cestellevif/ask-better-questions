import {useCallback} from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {useReducedMotion} from './useReducedMotion';

const SLIDE_OFFSET = 48;
const EXIT_DURATION = 220;
const ENTER_DURATION = 340;

export function useRollTransition() {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{translateX: translateX.value}],
  }));

  const rollOut = useCallback(
    (callback: () => void) => {
      if (reduceMotion) {
        callback();
        return;
      }
      opacity.value = withTiming(0, {duration: EXIT_DURATION});
      translateX.value = withTiming(
        -SLIDE_OFFSET,
        {duration: EXIT_DURATION},
        finished => {
          if (finished) {
            runOnJS(callback)();
            // Snap to right, then spring into place while fading in
            translateX.value = SLIDE_OFFSET;
            opacity.value = withTiming(1, {duration: ENTER_DURATION});
            translateX.value = withSpring(0, {damping: 18, stiffness: 160});
          }
        },
      );
    },
    [reduceMotion, opacity, translateX],
  );

  return {rollOut, style};
}
