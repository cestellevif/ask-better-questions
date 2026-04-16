import React, {useState} from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {tokens} from '../theme/tokens';
import type {Item} from '../types/api';

const LABEL_COLORS: Record<string, {bg: string; text: string}> = {
  Words: {bg: 'rgba(255,215,0,0.15)', text: '#FFD700'},
  Proof: {bg: 'rgba(80,200,120,0.15)', text: '#50C878'},
  Missing: {bg: 'rgba(255,100,80,0.15)', text: '#FF6450'},
};

interface Props {
  item: Item;
  onExpand?: () => void;
}

export function ItemCard({item, onExpand}: Props) {
  const [expanded, setExpanded] = useState(false);
  const colors = LABEL_COLORS[item.label] ?? LABEL_COLORS.Words;
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const whyAnim = useSharedValue(0);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value * 45}deg`}],
  }));

  const whyStyle = useAnimatedStyle(() => ({
    opacity: whyAnim.value,
    transform: [{translateY: 6 * (1 - whyAnim.value)}],
  }));

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    AccessibilityInfo.announceForAccessibility(
      next ? `Expanded. ${(item.why ?? item.text).slice(0, 100)}` : 'Collapsed',
    );

    // Scroll to excerpt is navigation, not animation — always fire regardless of reduceMotion
    if (next) onExpand?.();

    if (reduceMotion) return;

    rotation.value = withSpring(next ? 1 : 0, {damping: 12, stiffness: 160});
    if (next) {
      whyAnim.value = 0;
      whyAnim.value = withSpring(1, {damping: 14, stiffness: 180});
    } else {
      whyAnim.value = withTiming(0, {duration: 120});
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={toggle}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}: ${item.text}`}
      accessibilityHint={expanded ? 'Collapse to hide explanation' : 'Expand to read why'}
      accessibilityState={{expanded}}
      hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
      <View style={styles.header}>
        <View style={[styles.badge, {backgroundColor: colors.bg}]}>
          <Text style={[styles.badgeText, {color: colors.text}]}>{item.label}</Text>
        </View>
        <Animated.Text
          style={[styles.icon, {color: colors.text}, iconStyle]}
          accessible={false}
          importantForAccessibility="no-hide-descendants">
          +
        </Animated.Text>
      </View>
      <Text style={styles.question}>{item.text}</Text>
      {expanded && (
        <Animated.Text style={[styles.why, whyStyle]}>
          {item.why}
        </Animated.Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.card,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusCard,
    padding: 12,
    marginBottom: 8,
    minHeight: 44,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  icon: {
    fontSize: 18,
    fontWeight: '300',
    lineHeight: 20,
  },
  question: {
    color: tokens.fg,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  why: {
    color: tokens.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
});
