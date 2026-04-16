import {useEffect, useRef, useState} from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import {AccessibilityInfo, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {tokens} from '../theme/tokens';
import {SPRING_SNAPPY} from '../theme/animation';
import type {ExtractCandidate} from '../types/api';

interface ItemProps {
  item: ExtractCandidate;
  index: number;
  exiting: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

function CandidateItem({item, index, exiting, onPress, accessibilityLabel}: ItemProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateX = useSharedValue(reduceMotion ? 0 : 48);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{translateX: translateX.value}],
  }));

  // Staggered entrance on mount
  useEffect(() => {
    if (reduceMotion) return;
    const delay = index * 55;
    opacity.value = withDelay(delay, withTiming(1, {duration: 280}));
    translateX.value = withDelay(delay, withSpring(0, SPRING_SNAPPY));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Staggered exit when parent triggers exiting
  useEffect(() => {
    if (!exiting || reduceMotion) return;
    const delay = index * 45;
    opacity.value = withDelay(delay, withTiming(0, {duration: 200}));
    translateX.value = withDelay(delay, withTiming(-48, {duration: 200}));
  }, [exiting]);

  return (
    <Animated.View style={style}>
      <TouchableOpacity
        style={styles.item}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double-tap to analyze this article">
        <Text style={styles.title} numberOfLines={2}>
          {item.title || item.url}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface Props {
  candidates: ExtractCandidate[];
  onPick: (url: string) => void;
  onCancel?: () => void;
}

export function CandidateList({candidates, onPick, onCancel}: Props) {
  const reduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const chosenUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handlePick(url: string) {
    if (exiting) return;
    const picked = candidates.find(c => c.url === url);
    AccessibilityInfo.announceForAccessibility(
      `Selected: ${picked?.title ?? 'article'}. Analyzing now.`
    );
    if (reduceMotion) {
      onPick(url);
      return;
    }
    chosenUrlRef.current = url;
    setExiting(true);
    // Wait for all items to finish exiting before triggering phase change
    const duration = (candidates.length - 1) * 45 + 200 + 20;
    timerRef.current = setTimeout(() => {
      if (chosenUrlRef.current) onPick(chosenUrlRef.current);
    }, duration);
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      accessibilityLabel={`${candidates.length} articles to choose from`}>
      <Text style={styles.prompt} accessibilityRole="header">
        This page has multiple articles. Pick one:
      </Text>
      {candidates.map((item, index) => (
        <CandidateItem
          key={item.url}
          item={item}
          index={index}
          exiting={exiting}
          onPress={() => handlePick(item.url)}
          accessibilityLabel={`Article ${index + 1} of ${candidates.length}: ${item.title || item.url}`}
        />
      ))}
      {onCancel && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            AccessibilityInfo.announceForAccessibility('Selection cancelled');
            onCancel();
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  container: {
    padding: 16,
  },
  prompt: {
    color: tokens.muted,
    fontSize: 13,
    marginBottom: 12,
  },
  backBtn: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backText: {
    color: tokens.muted,
    fontSize: 14,
  },
  item: {
    backgroundColor: tokens.card,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusCard,
    padding: 12,
    marginBottom: 8,
  },
  title: {
    color: tokens.fg,
    fontSize: 13,
    lineHeight: 18,
  },
});
