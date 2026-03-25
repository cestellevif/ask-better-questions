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
    // Pass 1: exact match
    let idx = text.indexOf(needle);
    // Pass 2: whitespace-collapsed
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
  const listRef = useRef<FlatList<CardData>>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const cards: CardData[] = [
    ...bundle[activeTab].map(item => ({kind: 'item' as const, item})),
    {kind: 'challenge' as const, tab: activeTab},
  ];

  const excerpts = bundle[activeTab]
    .map(item => item.excerpt)
    .filter((e): e is string => !!e);

  const segments = articleText ? buildSegments(articleText, excerpts) : [];

  function handleTabPress(key: keyof Bundle) {
    setActiveTab(key);
    listRef.current?.scrollToOffset({offset: 0, animated: false});
  }

  return (
    <View style={styles.container}>
      {/* Article area — 3/4 height */}
      <ScrollView
        style={[styles.articleScroll, isDark ? styles.articleDark : styles.articleLight]}
        contentContainerStyle={styles.articleContent}>
        {articleText ? (
          <Text style={isDark ? styles.articleTextDark : styles.articleTextLight}>
            {segments.map((seg, i) =>
              seg.highlight ? (
                <Text key={i} style={isDark ? styles.highlightDark : styles.highlightLight}>
                  {seg.text}
                </Text>
              ) : (
                <Text key={i}>{seg.text}</Text>
              ),
            )}
          </Text>
        ) : (
          <Text style={styles.noArticle}>Article text unavailable.</Text>
        )}
      </ScrollView>

      {/* Bottom deck — 1/4 height */}
      <View style={styles.deck}>
        {/* Mode tabs */}
        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => handleTabPress(tab.key)}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Swipeable cards */}
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
              renderItem={({item}) =>
                item.kind === 'item' ? (
                  <View style={[styles.cardSlide, {width: cardWidth}]}>
                    <ItemCard item={item.item} />
                  </View>
                ) : (
                  <View style={[styles.cardSlide, {width: cardWidth}]}>
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

  // Article — 3/4
  articleScroll: {flex: 3},
  articleLight: {backgroundColor: '#ffffff'},
  articleDark: {backgroundColor: tokens.bg},
  articleContent: {padding: 16, paddingBottom: 24},
  articleTextLight: {color: '#1a1a1a', fontSize: 15, lineHeight: 24},
  articleTextDark: {color: tokens.fg, fontSize: 15, lineHeight: 24},
  noArticle: {color: tokens.muted, fontSize: 13},
  highlightLight: {backgroundColor: 'rgba(255,215,0,0.35)', color: '#1a1a1a'},
  highlightDark: {backgroundColor: 'rgba(255,215,0,0.25)', color: tokens.fg},

  // Bottom deck — 1/4
  deck: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusCard,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  tabActive: {borderColor: tokens.yellow},
  tabText: {color: tokens.muted, fontSize: 12},
  tabTextActive: {color: tokens.yellow},

  cardArea: {flex: 1},
  cardSlide: {paddingHorizontal: 16},
});
