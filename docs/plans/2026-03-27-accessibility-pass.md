# Accessibility Pass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the React Native mobile app to WCAG 2.1 Level AA, fixing all 47 issues from the accessibility audit.

**Architecture:** Changes are purely additive props and two small hooks — no component restructuring needed. A shared `useReducedMotion` hook centralises the `AccessibilityInfo.isReduceMotionEnabled()` check and is consumed by any component that animates. All other changes are accessibility props on existing elements.

**Tech Stack:** React Native 0.84, `AccessibilityInfo` (built-in RN), `Animated` (built-in RN)

---

## Notes on the audit

A few recommendations in the raw audit needed correction before implementing:

- `"list"`, `"listitem"`, `"article"`, `"main"` are **not valid** React Native `accessibilityRole` values — omit or use `"none"` / descriptive `accessibilityLabel` instead. Valid roles used below: `"button"`, `"header"`, `"tab"`, `"tablist"`, `"alert"`, `"adjustable"`, `"text"`.
- `aria-hidden` is web API — use `importantForAccessibility="no-hide-descendants"` (Android) or `accessible={false}` on native.
- Font scaling in RN `<Text>` is automatic by default — no changes needed.
- `AccessibilityInfo.isReduceMotionEnabled()` is the correct API (not `isScreenReaderEnabled`).
- Language declaration, keyboard shortcut docs, and pause/play on warmup slides are out of scope — low ROI for native mobile.

---

## Task 1: `useReducedMotion` hook

**Files:**
- Create: `mobile/src/hooks/useReducedMotion.ts`

**Step 1: Write the hook**

```ts
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
```

**Step 2: Commit**

```bash
git add mobile/src/hooks/useReducedMotion.ts
git commit -m "feat(a11y): add useReducedMotion hook"
```

---

## Task 2: Contrast tokens

**Files:**
- Modify: `mobile/src/theme/tokens.ts`

**What to change:**

- `border`: `rgba(255,255,255,0.12)` → `rgba(255,255,255,0.28)` — input/card borders need ≥3:1 ratio against `#0f0f10`
- `muted`: `rgba(255,255,255,0.60)` → `rgba(255,255,255,0.68)` — safer margin for small body text

```ts
export const tokens = {
  // Brand
  yellow: '#FFD700',
  brandYellow: 'rgba(255,215,0,0.82)',

  // Dark backgrounds (results panel)
  bg: '#0f0f10',
  fg: '#f2f2f2',
  card: '#17181a',
  border: 'rgba(255,255,255,0.28)',     // was 0.12 — boosts UI component contrast to ~3.5:1
  muted: 'rgba(255,255,255,0.68)',      // was 0.60 — safer margin for 13px text

  // Slate (warmup screen)
  slateBg: '#1f2933',
  slateText: '#f5f7fa',
  slateMuted: 'rgba(245,247,250,0.72)',

  // Shape
  radiusCard: 10,
  radiusPill: 999,
};
```

**Step 2: Commit**

```bash
git add mobile/src/theme/tokens.ts
git commit -m "feat(a11y): improve border and muted contrast ratios"
```

---

## Task 3: `HomeScreen`

**Files:**
- Modify: `mobile/src/screens/HomeScreen.tsx`

**What to change:**

1. `TextInput` — add `accessibilityLabel` and `accessibilityHint`
2. `TouchableOpacity` (Analyze button) — add `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, `accessibilityState`

Replace:

```tsx
<TextInput
  style={styles.input}
  value={url}
  onChangeText={setUrl}
  placeholder="https://…"
  placeholderTextColor={tokens.muted}
  autoCapitalize="none"
  autoCorrect={false}
  keyboardType="url"
  returnKeyType="go"
  onSubmitEditing={handleAnalyze}
/>

<TouchableOpacity
  style={[styles.btn, !url.trim() && styles.btnDisabled]}
  onPress={handleAnalyze}
  disabled={!url.trim()}>
  <Text style={styles.btnText}>Analyze</Text>
</TouchableOpacity>
```

With:

```tsx
<TextInput
  style={styles.input}
  value={url}
  onChangeText={setUrl}
  placeholder="https://…"
  placeholderTextColor={tokens.muted}
  autoCapitalize="none"
  autoCorrect={false}
  keyboardType="url"
  returnKeyType="go"
  onSubmitEditing={handleAnalyze}
  accessibilityLabel="Article URL"
  accessibilityHint="Paste or type the full URL of an article, then tap Analyze"
/>

<TouchableOpacity
  style={[styles.btn, !url.trim() && styles.btnDisabled]}
  onPress={handleAnalyze}
  disabled={!url.trim()}
  accessibilityRole="button"
  accessibilityLabel="Analyze"
  accessibilityHint={url.trim() ? 'Analyzes the article at the entered URL' : 'Enter a URL first'}
  accessibilityState={{disabled: !url.trim()}}>
  <Text style={styles.btnText}>Analyze</Text>
</TouchableOpacity>
```

**Step 2: Commit**

```bash
git add mobile/src/screens/HomeScreen.tsx
git commit -m "feat(a11y): label TextInput and Analyze button in HomeScreen"
```

---

## Task 4: `ItemCard`

**Files:**
- Modify: `mobile/src/components/ItemCard.tsx`

**What to change:**

1. Import `useReducedMotion`
2. Skip spring animations when reduced motion is on
3. Add `accessibilityRole`, `accessibilityLabel`, `accessibilityState`, `accessibilityHint` to the card `TouchableOpacity`
4. Hide the decorative `+` icon from the a11y tree

Full updated component (replace entire file content):

```tsx
import React, {useRef, useState} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const rotation = useRef(new Animated.Value(0)).current;
  const whyAnim = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();

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

    if (reduceMotion) return;

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
    <TouchableOpacity
      style={styles.card}
      onPress={toggle}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}: ${item.text}`}
      accessibilityHint={expanded ? 'Collapse to hide explanation' : 'Expand to read why'}
      accessibilityState={{expanded}}>
      <View style={styles.header}>
        <View style={[styles.badge, {backgroundColor: colors.bg}]}>
          <Text style={[styles.badgeText, {color: colors.text}]}>{item.label}</Text>
        </View>
        {/* Decorative icon — hidden from screen readers */}
        <Animated.Text
          style={[styles.icon, {color: colors.text, transform: [{rotate: iconRotate}]}]}
          accessible={false}
          importantForAccessibility="no-hide-descendants">
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
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },
});
```

**Step 2: Commit**

```bash
git add mobile/src/components/ItemCard.tsx
git commit -m "feat(a11y): accessible labels, expanded state, and reduced-motion guard in ItemCard"
```

---

## Task 5: `WarmupScreen`

**Files:**
- Modify: `mobile/src/components/WarmupScreen.tsx`

**What to change:**

1. Import `useReducedMotion` and skip the ticker animation when on
2. Add `accessibilityLiveRegion="polite"` to the status text so stage changes are announced
3. Silence the decorative slide text from the a11y tree

```tsx
import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {tokens} from '../theme/tokens';

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
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return; // Keep the first slide static; no flashing

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
  }, [opacity, reduceMotion]);

  return (
    <View style={styles.container}>
      <View style={styles.shell}>
        {/* Decorative ticker — hidden from screen readers */}
        <Animated.Text
          style={[styles.slide, {opacity}]}
          accessible={false}
          importantForAccessibility="no-hide-descendants">
          {SLIDES[slideIdx]}
        </Animated.Text>

        {/* Loading stage — announced to screen readers as it changes */}
        <Text
          style={styles.statusText}
          accessibilityLiveRegion="polite">
          {stage}
        </Text>
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
```

**Step 2: Commit**

```bash
git add mobile/src/components/WarmupScreen.tsx
git commit -m "feat(a11y): live region on status, reduced-motion guard in WarmupScreen"
```

---

## Task 6: `ErrorBanner`

**Files:**
- Modify: `mobile/src/components/ErrorBanner.tsx`

**What to change:**

1. Add `useEffect` to call `AccessibilityInfo.announceForAccessibility` when mounted (or when `message` changes)
2. Add `accessibilityRole="alert"` to the container
3. Add `accessibilityRole="button"` + label to the retry button

```tsx
import React, {useEffect} from 'react';
import {AccessibilityInfo, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {tokens} from '../theme/tokens';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({message, onRetry}: Props) {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`Error: ${message}`);
  }, [message]);

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive">
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.btn}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          accessibilityHint="Retry the previous analysis">
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  btn: {
    borderWidth: 1,
    borderColor: tokens.yellow,
    borderRadius: tokens.radiusPill,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  btnText: {
    color: tokens.yellow,
    fontSize: 13,
    fontWeight: '600',
  },
});
```

**Step 2: Commit**

```bash
git add mobile/src/components/ErrorBanner.tsx
git commit -m "feat(a11y): alert role and screen-reader announcement in ErrorBanner"
```

---

## Task 7: `CandidateList`

**Files:**
- Modify: `mobile/src/components/CandidateList.tsx`

**What to change:**

1. Each list item `TouchableOpacity` needs `accessibilityRole="button"` and a label that includes the article title
2. The `FlatList` should carry `accessibilityLabel` with the count

```tsx
import React from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {tokens} from '../theme/tokens';
import type {ExtractCandidate} from '../types/api';

interface Props {
  candidates: ExtractCandidate[];
  onPick: (url: string) => void;
}

export function CandidateList({candidates, onPick}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.prompt} accessibilityRole="header">
        This page has multiple articles. Pick one:
      </Text>
      <FlatList
        data={candidates}
        keyExtractor={item => item.url}
        accessibilityLabel={`${candidates.length} articles to choose from`}
        renderItem={({item, index}) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => onPick(item.url)}
            accessibilityRole="button"
            accessibilityLabel={`Article ${index + 1} of ${candidates.length}: ${item.title || item.url}`}
            accessibilityHint="Double-tap to analyze this article">
            <Text style={styles.title} numberOfLines={2}>
              {item.title || item.url}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg,
    padding: 16,
  },
  prompt: {
    color: tokens.muted,
    fontSize: 12,
    marginBottom: 12,
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
```

**Step 2: Commit**

```bash
git add mobile/src/components/CandidateList.tsx
git commit -m "feat(a11y): item labels and list count in CandidateList"
```

---

## Task 8: `ChallengeCard`

**Files:**
- Modify: `mobile/src/components/ChallengeCard.tsx`

**What to change:**

1. Add `accessibilityRole="header"` to the "Your move" label
2. Make the card `View` accessible as a logical unit with `accessible={true}` and a combined label

```tsx
import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {tokens} from '../theme/tokens';
import type {Bundle} from '../types/api';

// ... (CHALLENGES const unchanged)

export function ChallengeCard({tab}: {tab: keyof Bundle}) {
  const [idx] = useState(() =>
    Math.floor(Math.random() * CHALLENGES[tab].length),
  );
  const text = CHALLENGES[tab][idx];
  return (
    <View
      style={styles.card}
      accessible={true}
      accessibilityLabel={`Your move: ${text}`}>
      <Text style={styles.label} accessibilityRole="header">
        Your move
      </Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add mobile/src/components/ChallengeCard.tsx
git commit -m "feat(a11y): accessible label and header role in ChallengeCard"
```

---

## Task 9: `MeterBar`

**Files:**
- Modify: `mobile/src/components/MeterBar.tsx`

**What to change:**

1. Mark the whole bar as a single accessible unit (`accessible={true}`) so screen readers read label + value together
2. Set `accessibilityRole="progressbar"` and `accessibilityValue` with `min`/`max`/`now`
3. Announce the final value when the animation settles

```tsx
import React, {useEffect, useRef} from 'react';
import {AccessibilityInfo, Animated, StyleSheet, Text, View} from 'react-native';
import {tokens} from '../theme/tokens';
import type {Meter} from '../types/api';

export function MeterBar({meter}: {meter: Meter}) {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: meter.value,
      duration: 600,
      useNativeDriver: false,
    }).start(() => {
      AccessibilityInfo.announceForAccessibility(
        `Source quality: ${meter.label}`,
      );
    });
  }, [fillAnim, meter.value, meter.label]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel="Source quality"
      accessibilityValue={{min: 0, max: 100, now: meter.value, text: meter.label}}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, {width: fillWidth}]} />
      </View>
      <Text style={styles.label} accessible={false}>
        {meter.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: tokens.border,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: tokens.yellow,
    borderRadius: 99,
  },
  label: {
    color: tokens.muted,
    fontSize: 11,
  },
});
```

**Step 2: Commit**

```bash
git add mobile/src/components/MeterBar.tsx
git commit -m "feat(a11y): progressbar role and value announcement in MeterBar"
```

---

## Task 10: `ResultsScreen`

**Files:**
- Modify: `mobile/src/screens/ResultsScreen.tsx`

**What to change (5 areas):**

**A. Tab bar** — `accessibilityRole="tablist"` on the row; `"tab"` + `accessibilityState` on each tab.

**B. Horizontal FlatList** — track current card index via `onMomentumScrollEnd`; announce page position; mark each slide with a label.

**C. Article highlights** — highlighted `<Text>` spans get `accessibilityLabel` prefixed with "Highlighted:".

**D. Article region** — `ScrollView` gets an `accessibilityLabel`.

**E. "No article" fallback** — add `accessibilityRole="alert"`.

Key additions to the existing file (show only the changed sections for brevity — the full file structure stays the same):

```tsx
// Add to imports
import {AccessibilityInfo} from 'react-native'; // already have useColorScheme

// Inside ResultsScreen component, after existing state:
const [currentCardIndex, setCurrentCardIndex] = useState(0);

function handleScrollEnd(event: {nativeEvent: {contentOffset: {x: number}}}) {
  const index = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
  setCurrentCardIndex(index);
}

// Tab bar View — add:
accessibilityRole="tablist"

// Each tab TouchableOpacity — replace:
<TouchableOpacity
  key={tab.key}
  style={[styles.tab, activeTab === tab.key && styles.tabActive]}
  onPress={() => handleTabPress(tab.key)}
  accessibilityRole="tab"
  accessibilityLabel={tab.label}
  accessibilityState={{selected: activeTab === tab.key}}>

// Article ScrollView — add:
accessibilityLabel="Article content"

// "No article" Text — add:
accessibilityRole="alert"

// FlatList — add:
onMomentumScrollEnd={handleScrollEnd}
accessibilityLabel={`${cards.length} cards`}

// Each cardSlide View — add:
accessibilityLabel={`Card ${index + 1} of ${cards.length}`}

// Highlighted text spans — change to:
<Text
  key={i}
  style={isDark ? styles.highlightDark : styles.highlightLight}
  accessibilityLabel={`Highlighted: ${seg.text}`}>
  {seg.text}
</Text>
```

Full updated `ResultsScreen.tsx` (complete replacement):

```tsx
import React, {useState, useRef} from 'react';
import {
  AccessibilityInfo,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import {ChallengeCard} from '../components/ChallengeCard';
import {ItemCard} from '../components/ItemCard';
import {tokens} from '../theme/tokens';
import type {Bundle, Item, Meter} from '../types/api';

type CardData =
  | {kind: 'item'; item: Item}
  | {kind: 'challenge'; tab: keyof Bundle};

const TABS: {key: keyof Bundle; label: string}[] = [
  {key: 'fast', label: 'Quick'},
  {key: 'deeper', label: 'Curious'},
  {key: 'cliff', label: 'Answers'},
];

interface Props {
  bundle: Bundle;
  meter?: Meter;
  articleText?: string;
}

type Segment = {text: string; highlight: boolean};

function buildSegments(text: string, excerpts: string[]): Segment[] {
  const ranges: {start: number; end: number}[] = [];

  for (const raw of excerpts) {
    if (!raw) continue;
    const needle = raw.trim();
    let idx = text.indexOf(needle);
    if (idx === -1) {
      const collapsed = text.replace(/\s+/g, ' ');
      const needleCollapsed = needle.replace(/\s+/g, ' ');
      idx = collapsed.indexOf(needleCollapsed);
    }
    if (idx !== -1) {
      ranges.push({start: idx, end: idx + needle.length});
    }
  }

  if (ranges.length === 0) return [{text, highlight: false}];

  ranges.sort((a, b) => a.start - b.start);
  const merged: {start: number; end: number}[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({...r});
    }
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const {start, end} of merged) {
    if (cursor < start) segments.push({text: text.slice(cursor, start), highlight: false});
    segments.push({text: text.slice(start, end), highlight: true});
    cursor = end;
  }
  if (cursor < text.length) segments.push({text: text.slice(cursor), highlight: false});
  return segments;
}

export function ResultsScreen({bundle, articleText}: Props) {
  const [activeTab, setActiveTab] = useState<keyof Bundle>('fast');
  const [cardWidth, setCardWidth] = useState(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const listRef = useRef<FlatList<CardData>>(null);
  const articleScrollRef = useRef<ScrollView>(null);
  const paragraphYRef = useRef<Record<number, number>>({});
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const cards: CardData[] = [
    ...bundle[activeTab].map(item => ({kind: 'item' as const, item})),
    {kind: 'challenge' as const, tab: activeTab},
  ];

  const excerpts = bundle[activeTab]
    .map(item => item.excerpt)
    .filter((e): e is string => !!e);

  const paragraphs = articleText
    ? articleText.split(/\n+/).filter(p => p.trim())
    : [];

  function scrollToExcerpt(excerpt: string | undefined) {
    if (!excerpt || !articleText) return;
    const needle = excerpt.trim();
    const needleCollapsed = needle.replace(/\s+/g, ' ');

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      if (para.includes(needle) || para.replace(/\s+/g, ' ').includes(needleCollapsed)) {
        const y = paragraphYRef.current[i];
        if (y !== undefined) {
          articleScrollRef.current?.scrollTo({y: Math.max(0, y - 12), animated: true});
        }
        return;
      }
    }
  }

  function handleTabPress(key: keyof Bundle) {
    setActiveTab(key);
    setCurrentCardIndex(0);
    listRef.current?.scrollToOffset({offset: 0, animated: false});
  }

  function handleScrollEnd(event: {nativeEvent: {contentOffset: {x: number}}}) {
    const index = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setCurrentCardIndex(index);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={articleScrollRef}
        style={[styles.articleScroll, isDark ? styles.articleDark : styles.articleLight]}
        contentContainerStyle={styles.articleContent}
        accessibilityLabel="Article content">
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => (
            <View
              key={idx}
              onLayout={e => {
                paragraphYRef.current[idx] = e.nativeEvent.layout.y;
              }}>
              <Text style={isDark ? styles.articleTextDark : styles.articleTextLight}>
                {buildSegments(para, excerpts).map((seg, i) =>
                  seg.highlight ? (
                    <Text
                      key={i}
                      style={isDark ? styles.highlightDark : styles.highlightLight}
                      accessibilityLabel={`Highlighted: ${seg.text}`}>
                      {seg.text}
                    </Text>
                  ) : (
                    <Text key={i}>{seg.text}</Text>
                  ),
                )}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noArticle} accessibilityRole="alert">
            Article text unavailable.
          </Text>
        )}
      </ScrollView>

      <View style={styles.deck}>
        <View style={styles.tabBar} accessibilityRole="tablist">
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => handleTabPress(tab.key)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{selected: activeTab === tab.key}}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={styles.cardArea}
          onLayout={e => setCardWidth(e.nativeEvent.layout.width)}>
          {cardWidth > 0 && (
            <FlatList
              ref={listRef}
              data={cards}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => `${activeTab}-${i}`}
              onMomentumScrollEnd={handleScrollEnd}
              accessibilityLabel={`${cards.length} cards`}
              renderItem={({item, index}) =>
                item.kind === 'item' ? (
                  <View
                    style={[styles.cardSlide, {width: cardWidth}]}
                    accessibilityLabel={`Card ${index + 1} of ${cards.length}`}>
                    <ItemCard
                      item={item.item}
                      onExpand={() => scrollToExcerpt(item.item.excerpt)}
                    />
                  </View>
                ) : (
                  <View
                    style={[styles.cardSlide, {width: cardWidth}]}
                    accessibilityLabel={`Card ${index + 1} of ${cards.length}`}>
                    <ChallengeCard tab={item.tab} />
                  </View>
                )
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: tokens.bg},

  articleScroll: {flex: 1},
  articleLight: {backgroundColor: '#ffffff'},
  articleDark: {backgroundColor: tokens.bg},
  articleContent: {padding: 16, paddingBottom: 24},
  articleTextLight: {color: '#1a1a1a', fontSize: 15, lineHeight: 24, marginBottom: 12},
  articleTextDark: {color: tokens.fg, fontSize: 15, lineHeight: 24, marginBottom: 12},
  noArticle: {color: tokens.muted, fontSize: 13},
  highlightLight: {backgroundColor: 'rgba(255,215,0,0.50)', color: '#1a1a1a'},
  highlightDark: {backgroundColor: 'rgba(255,215,0,0.35)', color: tokens.fg},

  deck: {
    height: 155,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  tab: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusCard,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  tabActive: {borderColor: tokens.yellow},
  tabText: {color: tokens.muted, fontSize: 11},
  tabTextActive: {color: tokens.yellow},

  cardArea: {flex: 1},
  cardSlide: {paddingHorizontal: 16},
});
```

**Step 2: Commit**

```bash
git add mobile/src/screens/ResultsScreen.tsx
git commit -m "feat(a11y): tab roles, card position labels, highlight labels, and article region in ResultsScreen"
```

---

## Task 11: `AnalysisScreen`

**Files:**
- Modify: `mobile/src/screens/AnalysisScreen.tsx`

**What to change:**

Announce phase transitions using `AccessibilityInfo.announceForAccessibility` alongside the existing `navigation.setOptions` call.

```tsx
import React, {useEffect} from 'react';
import {AccessibilityInfo, View} from 'react-native';
// ... rest of imports unchanged

export function AnalysisScreen({route, navigation}: Props) {
  const urlFromNav = route.params?.url;
  const {phase, run} = useAnalysis();

  useEffect(() => {
    let title = 'Analyzing…';
    let announcement = '';

    if (phase.kind === 'result') {
      title = 'Results';
      announcement = 'Analysis complete. Results are ready.';
    } else if (phase.kind === 'choice') {
      title = 'Choose article';
      announcement = 'Multiple articles found. Please choose one.';
    } else if (phase.kind === 'error') {
      title = 'Error';
      // ErrorBanner announces its own message — no duplicate here
    } else if (phase.kind === 'loading') {
      announcement = phase.stage;
    }

    navigation.setOptions({title});
    if (announcement) {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [phase.kind, navigation]);

  // ... rest of component unchanged
```

**Step 2: Commit**

```bash
git add mobile/src/screens/AnalysisScreen.tsx
git commit -m "feat(a11y): announce phase transitions in AnalysisScreen"
```

---

## Task 12: Push

```bash
git push
```

---

## Manual testing checklist (after all tasks complete)

**Android TalkBack:**
- [ ] Home screen: input announces "Article URL", button announces "Analyze" + disabled state
- [ ] Home screen: disabled button says "dimmed" when URL is empty
- [ ] Warmup screen: stage label is announced as it changes (no ticker announcement)
- [ ] Reduce Motion on: warmup ticker stays still; ItemCard expands without spring
- [ ] Results screen: swiping FlatList left/right reads "Card N of 4"
- [ ] Results screen: tabs say "Quick, tab, selected/unselected"
- [ ] ItemCard: reads label + question, says "expanded/collapsed"
- [ ] ItemCard expand: "why" text is read after expanding
- [ ] ChallengeCard: reads "Your move: [text]" as a single unit
- [ ] MeterBar: announces "Source quality: [label]" once bar finishes animating
- [ ] ErrorBanner: error is immediately announced when shown
- [ ] CandidateList: each item reads "Article N of M: [title]"
- [ ] Highlighted text: reads "Highlighted: [excerpt]"

**Reduce Motion (Settings → Accessibility → Remove Animations):**
- [ ] WarmupScreen: slide does not fade/swap
- [ ] ItemCard: opens and closes with no spring animation
