import React, {useRef, useState} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const rotation = useRef(new Animated.Value(0)).current;
  const whyAnim = useRef(new Animated.Value(0)).current;

  const iconRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const whyOpacity = whyAnim;
  const whyTranslateY = whyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 0],
  });

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(rotation, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      damping: 12,
      stiffness: 160,
    }).start();
    if (next) {
      whyAnim.setValue(0);
      Animated.spring(whyAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 14,
        stiffness: 180,
      }).start();
      onExpand?.();
    } else {
      Animated.timing(whyAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  }

  return (
    <TouchableOpacity style={styles.card} onPress={toggle} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={[styles.badge, {backgroundColor: colors.bg}]}>
          <Text style={[styles.badgeText, {color: colors.text}]}>{item.label}</Text>
        </View>
        <Animated.Text style={[styles.icon, {color: colors.text, transform: [{rotate: iconRotate}]}]}>
          +
        </Animated.Text>
      </View>
      <Text style={styles.question}>{item.text}</Text>
      {expanded && (
        <Animated.Text
          style={[
            styles.why,
            {opacity: whyOpacity, transform: [{translateY: whyTranslateY}]},
          ]}>
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
    fontSize: 10,
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
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },
});
