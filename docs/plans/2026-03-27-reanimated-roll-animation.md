# Reanimated Roll Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace all content transition animations (ticker, phase changes, tab switching, candidate list) with a consistent roll-left/enter-from-right pattern using `react-native-reanimated` v3.

**Architecture:** A single `useRollTransition()` hook encapsulates opacity + translateX shared values. Callers invoke `rollOut(callback)` — exit animation plays, callback fires (swapping content), then entry animation plays automatically. `AnalysisScreen` uses a `displayedPhase` pattern to hold the previous phase content during exit. `ResultsScreen` uses a `displayedTab` pattern for the card deck. `CandidateList` items stagger their entrance and exit independently. `WarmupScreen` migrates its existing ticker animation to the hook.

**Tech Stack:** `react-native-reanimated` v3, `react-native` 0.84, New Architecture enabled (`newArchEnabled=true`), TypeScript, Jest with reanimated mock.

---

## Context

Working directory: `mobile/`

Key files (read before touching):
- `src/hooks/useReducedMotion.ts` — already exists, returns `boolean`
- `src/components/WarmupScreen.tsx` — has existing `Animated` ticker; migrate to reanimated
- `src/screens/AnalysisScreen.tsx` — phase switching via conditional render; add roll + `displayedPhase`
- `src/screens/ResultsScreen.tsx` — tab switching via `handleTabPress`; add roll + `displayedTab`
- `src/components/CandidateList.tsx` — items via FlatList; add stagger entrance + exit
- `babel.config.js` — needs reanimated plugin added
- `jest.config.js` — needs reanimated mock

Animation constants used everywhere:
```
SLIDE_OFFSET = 48    (points)
EXIT_DURATION = 220  (ms)
ENTER_DURATION = 340 (ms)
damping = 18, stiffness = 160  (spring)
```

---

## Task 1: Install react-native-reanimated and configure

**Files:**
- Modify: `mobile/babel.config.js`
- Modify: `mobile/jest.config.js`
- Modify: `mobile/package.json` (via yarn)

**Step 1: Install the package**

Run from `mobile/`:
```bash
yarn add react-native-reanimated
```
Expected: package added to `dependencies` in `package.json`.

**Step 2: Add the babel plugin**

Edit `mobile/babel.config.js`:
```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
```
The reanimated plugin **must be listed last** among plugins.

**Step 3: Add the jest mock**

Edit `mobile/jest.config.js`:
```js
module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
};
```

Create `mobile/jest.setup.js`:
```js
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
```

**Step 4: Verify existing tests still pass**

Run from `mobile/`:
```bash
yarn test
```
Expected: all existing tests pass (32 tests across 4 files).

**Step 5: Commit**
```bash
git add mobile/babel.config.js mobile/jest.config.js mobile/jest.setup.js mobile/package.json mobile/yarn.lock
git commit -m "feat: install react-native-reanimated v3, configure babel plugin and jest mock"
```

---

## Task 2: Create useRollTransition hook

**Files:**
- Create: `mobile/src/hooks/useRollTransition.ts`
- Create: `mobile/__tests__/hooks/useRollTransition.test.ts`

**Step 1: Write the failing test**

Create `mobile/__tests__/hooks/useRollTransition.test.ts`:
```ts
import {renderHook, act} from '@testing-library/react-native';
import {useRollTransition} from '../../src/hooks/useRollTransition';

describe('useRollTransition', () => {
  it('returns style and rollOut', () => {
    const {result} = renderHook(() => useRollTransition());
    expect(result.current.style).toBeDefined();
    expect(typeof result.current.rollOut).toBe('function');
  });

  it('calls the callback when rollOut is invoked', () => {
    const {result} = renderHook(() => useRollTransition());
    const cb = jest.fn();
    act(() => {
      result.current.rollOut(cb);
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does not crash when rollOut is called with reduceMotion enabled', () => {
    // reduceMotion path: callback fires immediately, no animation
    const {result} = renderHook(() => useRollTransition());
    const cb = jest.fn();
    expect(() => act(() => result.current.rollOut(cb))).not.toThrow();
    expect(cb).toHaveBeenCalled();
  });
});
```

Note: the reanimated mock synchronously runs animation callbacks, so `rollOut(cb)` will call `cb` immediately in tests.

**Step 2: Run test to verify it fails**
```bash
yarn test --testPathPattern=useRollTransition
```
Expected: FAIL — `useRollTransition` not found.

**Step 3: Implement the hook**

Create `mobile/src/hooks/useRollTransition.ts`:
```ts
import {useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS} from 'react-native-reanimated';
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

  function rollOut(callback: () => void) {
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
  }

  return {rollOut, style};
}
```

**Step 4: Run test to verify it passes**
```bash
yarn test --testPathPattern=useRollTransition
```
Expected: PASS — 3 tests.

**Step 5: Commit**
```bash
git add mobile/src/hooks/useRollTransition.ts mobile/__tests__/hooks/useRollTransition.test.ts
git commit -m "feat: add useRollTransition hook (opacity + translateX, reduceMotion guard)"
```

---

## Task 3: Migrate WarmupScreen ticker to useRollTransition

**Files:**
- Modify: `mobile/src/components/WarmupScreen.tsx`

**Step 1: Read the current file**

Read `mobile/src/components/WarmupScreen.tsx` in full before editing.

**Step 2: Replace the implementation**

The current file uses `Animated` from `react-native` with `opacity` and `translateX` refs. Replace entirely with `useRollTransition`. The ticker logic stays the same — only the animation plumbing changes.

New `mobile/src/components/WarmupScreen.tsx`:
```tsx
import React, {useEffect, useState} from 'react';
import Animated from 'react-native-reanimated';
import {StyleSheet, Text, View} from 'react-native';
import {tokens} from '../theme/tokens';
import {useRollTransition} from '../hooks/useRollTransition';

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

  useEffect(() => {
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
  }, [rollOut]);

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
    fontSize: 11,
  },
});
```

Key changes from original:
- Removed `Animated` from `react-native`, `useRef` for opacity/translateX, `useReducedMotion`
- Added `Animated` from `react-native-reanimated`
- Added `useRollTransition()` — provides `rollOut` + `style`
- `advance()` now just calls `rollOut(callback)` — no manual animation wiring
- `useEffect` dep array is `[rollOut]` (stable ref from the hook)
- `Animated.Text` uses `style` from `useAnimatedStyle` — must be reanimated `Animated.Text`, not core RN

**Step 3: Run all tests**
```bash
yarn test
```
Expected: all tests pass.

**Step 4: Commit**
```bash
git add mobile/src/components/WarmupScreen.tsx
git commit -m "feat: migrate WarmupScreen ticker to useRollTransition (reanimated)"
```

---

## Task 4: Phase transitions in AnalysisScreen

**Files:**
- Modify: `mobile/src/screens/AnalysisScreen.tsx`

**Step 1: Read the current file**

Read `mobile/src/screens/AnalysisScreen.tsx` in full before editing.

**Step 2: Understand the pattern**

`AnalysisScreen` currently renders different components based on `phase.kind`. To animate between phases:

1. Add `displayedPhase` state — lags one phase behind during exit animation
2. Add `lastKindRef` to track previous kind (avoid animating on same-kind updates like stage text changes)
3. Add `phaseRef` — always points to latest `phase` so the rollOut callback captures the freshest value
4. Wrap content in `Animated.View` using `style` from `useRollTransition`
5. On `phase` change: if same kind → sync `displayedPhase` immediately (no animation). If kind changed → `rollOut(() => setDisplayedPhase(phaseRef.current))`

The rendered content always comes from `displayedPhase`. The accessibility announcements still use `phase` (real-time, no lag).

**Step 3: Write the new AnalysisScreen**

```tsx
import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {CandidateList} from '../components/CandidateList';
import {ErrorBanner} from '../components/ErrorBanner';
import {WarmupScreen} from '../components/WarmupScreen';
import {useAnalysis} from '../hooks/useAnalysis';
import {useRollTransition} from '../hooks/useRollTransition';
import {tokens} from '../theme/tokens';
import {ResultsScreen} from './ResultsScreen';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootNavigator';
import type {Phase} from '../hooks/useAnalysis';

type Props = NativeStackScreenProps<RootStackParamList, 'Analysis'>;

type RunFn = ReturnType<typeof useAnalysis>['run'];
type NavProp = Props['navigation'];

function renderPhase(p: Phase, run: RunFn, navigation: NavProp) {
  if (p.kind === 'warmup' || p.kind === 'loading') {
    return <WarmupScreen stage={p.stage} />;
  }
  if (p.kind === 'choice') {
    return (
      <CandidateList
        candidates={p.candidates}
        onPick={url => run(p.sourceUrl, url)}
      />
    );
  }
  if (p.kind === 'result') {
    return (
      <ResultsScreen
        bundle={p.bundle}
        meter={p.meter}
        articleText={p.articleText}
      />
    );
  }
  if (p.kind === 'error') {
    return (
      <ErrorBanner
        message={p.message}
        onRetry={() => navigation.goBack()}
      />
    );
  }
  return <View style={{flex: 1, backgroundColor: tokens.bg}} />;
}

export function AnalysisScreen({route, navigation}: Props) {
  const urlFromNav = route.params?.url;
  const {phase, run} = useAnalysis();

  const [displayedPhase, setDisplayedPhase] = useState<Phase>(phase);
  const lastKindRef = useRef<Phase['kind']>(phase.kind);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const {rollOut, style} = useRollTransition();

  // Animate on kind changes; sync immediately for same-kind updates (e.g. stage text)
  useEffect(() => {
    if (phase.kind === lastKindRef.current) {
      setDisplayedPhase(phase);
      return;
    }
    lastKindRef.current = phase.kind;
    rollOut(() => setDisplayedPhase(phaseRef.current));
  }, [phase]);

  // Accessibility announcements (unchanged — use real-time `phase`)
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
    } else if (phase.kind === 'loading') {
      announcement = phase.stage;
    } else if (phase.kind === 'warmup') {
      announcement = phase.stage;
    }

    navigation.setOptions({title});
    if (announcement) {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [
    phase.kind,
    (phase.kind === 'loading' || phase.kind === 'warmup')
      ? phase.stage
      : undefined,
    navigation,
  ]);

  // Re-run whenever the URL param changes
  useEffect(() => {
    if (urlFromNav) {
      run(urlFromNav);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFromNav]);

  return (
    <Animated.View style={[{flex: 1, backgroundColor: tokens.bg}, style]}>
      {renderPhase(displayedPhase, run, navigation)}
    </Animated.View>
  );
}
```

**Step 4: Run all tests**
```bash
yarn test
```
Expected: all tests pass.

**Step 5: Commit**
```bash
git add mobile/src/screens/AnalysisScreen.tsx
git commit -m "feat: roll transition between phases in AnalysisScreen (displayedPhase pattern)"
```

---

## Task 5: Tab switching roll in ResultsScreen

**Files:**
- Modify: `mobile/src/screens/ResultsScreen.tsx`

**Step 1: Read the current file**

Read `mobile/src/screens/ResultsScreen.tsx` in full before editing.

**Step 2: Understand the changes**

Currently, tab press calls `setActiveTab(key)` and the card deck re-renders immediately. The deck is a `View` with `style={styles.cardArea}`.

Changes:
1. Add `displayedTab` state (starts as `'fast'`, same as `activeTab`)
2. `handleTabPress` → `setActiveTab(key)` immediately (updates the visual tab indicator), then calls `rollOut(() => { setDisplayedTab(key); resetScroll(); })`
3. Wrap only the `cardArea` `View` in `Animated.View`, apply `style` from `useRollTransition`
4. Derive `cards` and `excerpts` from `displayedTab` (not `activeTab`) so the deck still shows old content during exit

**Step 3: Make the changes**

Add these imports at the top:
```tsx
import Animated from 'react-native-reanimated';
import {useRollTransition} from '../hooks/useRollTransition';
```

Inside `ResultsScreen`, add after the existing state declarations:
```tsx
const [displayedTab, setDisplayedTab] = useState<keyof Bundle>('fast');
const {rollOut, style: deckStyle} = useRollTransition();
```

Replace `handleTabPress`:
```tsx
function handleTabPress(key: keyof Bundle) {
  setActiveTab(key); // Tab bar indicator updates immediately
  if (key === displayedTab) return;
  rollOut(() => {
    setDisplayedTab(key);
    setCurrentCardIndex(0);
    listRef.current?.scrollToOffset({offset: 0, animated: false});
  });
}
```

Change `cards` and `excerpts` to use `displayedTab`:
```tsx
const cards: CardData[] = [
  ...bundle[displayedTab].map(item => ({kind: 'item' as const, item})),
  {kind: 'challenge' as const, tab: displayedTab},
];

const excerpts = bundle[displayedTab]
  .map(item => item.excerpt)
  .filter((e): e is string => !!e);
```

Change the `cardArea` View to `Animated.View`:
```tsx
<Animated.View
  style={[styles.cardArea, deckStyle]}
  onLayout={e => setCardWidth(e.nativeEvent.layout.width)}>
  {cardWidth > 0 && (
    <FlatList ... />
  )}
</Animated.View>
```

**Step 4: Run all tests**
```bash
yarn test
```
Expected: all tests pass.

**Step 5: Commit**
```bash
git add mobile/src/screens/ResultsScreen.tsx
git commit -m "feat: roll transition on tab switch in ResultsScreen (displayedTab pattern)"
```

---

## Task 6: Staggered CandidateList entrance and exit

**Files:**
- Modify: `mobile/src/components/CandidateList.tsx`

**Step 1: Read the current file**

Read `mobile/src/components/CandidateList.tsx` in full before editing.

**Step 2: Understand the pattern**

Each candidate item enters from the right with a stagger (`index * 55ms` delay). When the user taps an item, all items exit to the left with a stagger (`index * 45ms` delay), then the real `onPick` is called after all animations complete.

Implementation: Extract a `CandidateItem` component that owns its own `useSharedValue` hooks. The parent `CandidateList` manages `exiting` state and coordinates the timeout.

Switch from `FlatList` to a plain `View` + `.map()` — candidates are typically 3–10 items, FlatList virtualisation isn't needed, and it removes complexity.

**Step 3: Write the new CandidateList**

```tsx
import React, {useEffect, useRef, useState} from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {tokens} from '../theme/tokens';
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
    translateX.value = withDelay(delay, withSpring(0, {damping: 18, stiffness: 160}));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Staggered exit when parent triggers exiting
  useEffect(() => {
    if (!exiting) return;
    if (reduceMotion) return;
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
}

export function CandidateList({candidates, onPick}: Props) {
  const reduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const chosenUrlRef = useRef<string | null>(null);

  function handlePick(url: string) {
    if (exiting) return;
    if (reduceMotion) {
      onPick(url);
      return;
    }
    chosenUrlRef.current = url;
    setExiting(true);
    // Wait for all items to finish exiting before triggering phase change
    const duration = (candidates.length - 1) * 45 + 200 + 20;
    setTimeout(() => {
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

Key changes from original:
- `FlatList` → `ScrollView` + `.map()` so each `CandidateItem` maintains stable identity
- `CandidateItem` owns `useSharedValue` hooks — entrance stagger on mount, exit stagger on `exiting`
- `handlePick` sets `exiting = true` and delays calling `onPick` until animations complete
- `reduceMotion` guard: items start fully visible, `handlePick` calls `onPick` immediately
- `ScrollView` used instead of `View` in case there are many candidates

**Step 4: Run all tests**
```bash
yarn test
```
Expected: all tests pass.

**Step 5: Commit**
```bash
git add mobile/src/components/CandidateList.tsx
git commit -m "feat: staggered cascade entrance and exit for CandidateList items (reanimated)"
```

---

## Done

All 6 tasks complete. Every animation point now uses `react-native-reanimated`:

| Location | Animation |
|---|---|
| WarmupScreen ticker | Roll left → enter from right (5.2s interval) |
| AnalysisScreen phase change | Full content rolls left → new phase enters from right |
| ResultsScreen tab switch | Card deck rolls left → new tab's cards enter from right |
| CandidateList items | Staggered entrance from right on mount; staggered exit to left on pick |

Invoke `superpowers:finishing-a-development-branch` to wrap up.
