import {useEffect, useState} from 'react';
import Animated from 'react-native-reanimated';
import {AccessibilityInfo, StyleSheet, Text, View} from 'react-native';
import {tokens} from '../theme/tokens';
import {useRollTransition} from '../hooks/useRollTransition';
import {useReducedMotion} from '../hooks/useReducedMotion';

const SLIDES = [
  'Ask Better Questions',
  'Read with Intent',
  'What do you hope to see?',
  'Question the author',
  'Is it heat, or just hot air?',
  "Don't get caught in someone else's emotion.",
  'Look for signals in the text.',
  "Notice what's missing.",
  'Pause before you react.',
  'Who benefits from believing this?',
  "What's the claim? What's the proof?",
  'Strong feeling? Slow down.',
  'Urgency is a signal, not a command.',
  'If it wants you angry, ask why.',
  "Loud doesn't mean true.",
  'Are you learning — or just nodding?',
  'Does this make sense — or just feel good?',
];

interface Props {
  stage: string;
}

export function WarmupScreen({stage}: Props) {
  const [slideIdx, setSlideIdx] = useState(
    () => Math.floor(Math.random() * SLIDES.length),
  );
  const {rollOut, style} = useRollTransition();
  const reduceMotion = useReducedMotion();

  // Announce the initial stage for screen readers (live region only fires on changes)
  useEffect(() => {
    if (stage) AccessibilityInfo.announceForAccessibility(stage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Under reduce-motion the ticker stays on the first slide — no cycling.
    if (reduceMotion) return;

    const advance = () => {
      rollOut(() => {
        setSlideIdx(i => {
          let next = Math.floor(Math.random() * SLIDES.length);
          while (next === i) next = Math.floor(Math.random() * SLIDES.length);
          return next;
        });
      });
    };

    const initial = setTimeout(advance, 2600);
    const interval = setInterval(advance, 5200);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [rollOut, reduceMotion]);

  return (
    <View style={styles.container}>
      <View style={styles.shell}>
        <Animated.Text
          style={[styles.slide, style]}
          accessible={false}
          importantForAccessibility="no-hide-descendants">
          {SLIDES[slideIdx]}
        </Animated.Text>

        <Text style={styles.statusText} accessibilityLiveRegion="polite">
          {stage}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  shell: {
    width: '100%',
    maxWidth: 600,
  },
  slide: {
    color: tokens.fg,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 28,
    lineHeight: 36,
  },
  statusText: {
    color: tokens.muted,
    fontSize: 12,
  },
});
