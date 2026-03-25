import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {tokens} from '../theme/tokens';

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

export function WarmupScreen({stage}: Props) {
  const [slideIdx, setSlideIdx] = useState(
    () => Math.floor(Math.random() * SLIDES.length),
  );
  const opacity = useRef(new Animated.Value(1)).current;

  // Ticker: fade out → swap slide (random, never consecutive) → fade in
  useEffect(() => {
    const advance = () => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setSlideIdx(i => {
          let next = Math.floor(Math.random() * SLIDES.length);
          while (next === i) next = Math.floor(Math.random() * SLIDES.length);
          return next;
        });
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    };

    const initial = setTimeout(advance, 2600);
    const interval = setInterval(advance, 5200);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [opacity]);

  return (
    <View style={styles.container}>
      <View style={styles.shell}>
        <Animated.Text style={[styles.slide, {opacity}]}>
          {SLIDES[slideIdx]}
        </Animated.Text>

        <Text style={styles.statusText}>{stage}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.slateBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  shell: {
    width: '100%',
    maxWidth: 600,
  },
  slide: {
    color: tokens.slateText,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 28,
    lineHeight: 36,
  },
  statusText: {
    color: tokens.slateMuted,
    fontSize: 11,
  },
});
