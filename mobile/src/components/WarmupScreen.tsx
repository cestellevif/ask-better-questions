import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {tokens} from '../theme/tokens';
import {useReducedMotion} from '../hooks/useReducedMotion';

// Same slides as the Chrome extension and webapp warmup
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

// How far off-screen the slide travels (in points)
const SLIDE_OFFSET = 48;

export function WarmupScreen({stage}: Props) {
  const [slideIdx, setSlideIdx] = useState(
    () => Math.floor(Math.random() * SLIDES.length),
  );
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();

  // Ticker: roll + fade left → swap → enter from right
  useEffect(() => {
    if (reduceMotion) return;

    const advance = () => {
      // Exit: roll left and fade out
      Animated.parallel([
        Animated.timing(opacity, {toValue: 0, duration: 220, useNativeDriver: true}),
        Animated.timing(translateX, {toValue: -SLIDE_OFFSET, duration: 220, useNativeDriver: true}),
      ]).start(() => {
        setSlideIdx(i => {
          let next = Math.floor(Math.random() * SLIDES.length);
          while (next === i) next = Math.floor(Math.random() * SLIDES.length);
          return next;
        });
        // Reset to right, then spring into place while fading in
        translateX.setValue(SLIDE_OFFSET);
        Animated.parallel([
          Animated.timing(opacity, {toValue: 1, duration: 340, useNativeDriver: true}),
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 160,
          }),
        ]).start();
      });
    };

    const initial = setTimeout(advance, 2600);
    const interval = setInterval(advance, 5200);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [opacity, translateX, reduceMotion]);

  return (
    <View style={styles.container}>
      <View style={styles.shell}>
        <Animated.Text
          style={[styles.slide, {opacity, transform: [{translateX}]}]}
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
    fontSize: 11,
  },
});
