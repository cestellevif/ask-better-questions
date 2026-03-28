import React, {useRef, useState} from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {ChallengeCard} from '../components/ChallengeCard';
import {ItemCard} from '../components/ItemCard';
import {useRollTransition} from '../hooks/useRollTransition';
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

export function buildSegments(text: string, excerpts: string[]): Segment[] {
  const ranges: {start: number; end: number}[] = [];

  for (const raw of excerpts) {
    if (!raw) continue;
    const needle = raw.trim();
    if (!needle) continue;
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
  const [displayedTab, setDisplayedTab] = useState<keyof Bundle>('fast');
  const {rollOut, style: deckStyle} = useRollTransition();
  const [cardWidth, setCardWidth] = useState(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const listRef = useRef<FlatList<CardData>>(null);
  const articleScrollRef = useRef<ScrollView>(null);
  const paragraphYRef = useRef<Record<number, number>>({});
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const cards: CardData[] = [
    ...bundle[displayedTab].map(item => ({kind: 'item' as const, item})),
    {kind: 'challenge' as const, tab: displayedTab},
  ];

  const excerpts = bundle[displayedTab]
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
          // Scroll with a small offset so the paragraph isn't flush against the top
          articleScrollRef.current?.scrollTo({y: Math.max(0, y - 12), animated: true});
        }
        return;
      }
    }
  }

  function handleTabPress(key: keyof Bundle) {
    setActiveTab(key); // Tab bar indicator updates immediately
    if (key === displayedTab) return;
    rollOut(() => {
      setDisplayedTab(key);
      setCurrentCardIndex(0);
      listRef.current?.scrollToOffset({offset: 0, animated: false});
    });
  }

  function handleScrollEnd(event: {nativeEvent: {contentOffset: {x: number}}}) {
    const index = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setCurrentCardIndex(index);
  }

  return (
    <View style={styles.container}>
      {/* Article — fills remaining space above the deck */}
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
                    <Text key={i} style={isDark ? styles.highlightDark : styles.highlightLight}>
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

      {/* Bottom deck — fixed height */}
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

        <Animated.View
          style={[styles.cardArea, deckStyle]}
          onLayout={e => setCardWidth(e.nativeEvent.layout.width)}>
          {cardWidth > 0 && (
            <FlatList
              ref={listRef}
              data={cards}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => `${displayedTab}-${i}`}
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
        </Animated.View>
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

  // Fixed-height bottom deck
  deck: {
    height: 209,
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
