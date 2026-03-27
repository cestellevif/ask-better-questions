import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {tokens} from '../theme/tokens';
import type {Bundle} from '../types/api';

const CHALLENGES: Record<keyof Bundle, string[]> = {
  fast: [
    'Before you share — find one source with the opposite take.',
    'Notice how groups are named. Do individuals get to speak, or are they described by others?',
    'Who is this story told for — and who is it told about?',
    'Does the headline describe people, or categories?',
    'What feeling does this story leave you with — and toward whom?',
    'Find one person quoted who was directly affected, not just an outside observer.',
    "What's the most surprising detail? Did you catch it on the first read?",
    'Before you react, name one assumption you brought to this story.',
    'Search for one other story about the same community from this week.',
  ],
  deeper: [
    "Who isn't in this story? What would they add?",
    'Which voices drive the narrative — and which are described by others?',
    'Who gets to be complex here? Who gets a single label?',
    'Does the story let the people it covers speak for themselves?',
    "What assumptions does the framing make about how you'll relate to these people?",
    "Where is the writer's own perspective most visible?",
    'If the people described read this, what would they agree with — and push back on?',
    'Find the most human detail. Was it centred or tucked away?',
    'What would change if this story were reported from inside the community it covers?',
  ],
  cliff: [
    "Pick one cue. Search for the evidence — or notice where it's missing.",
    'Find a first-person account that adds to what this story covers.',
    'Pay attention to the verbs. Who is active in this story — and who is just described?',
    'Look up the statistic cited. What does the fuller picture look like?',
    'Search for this story from a publication that serves the community it covers.',
    'Find who is quoted as an expert. Who else might have something to say?',
    'Identify the claim doing the most work. See how it holds up.',
    'Notice the language used for different groups. Is it consistent?',
    'Find one detail the headline left out that changes how you read the story.',
  ],
};

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
      <Text style={styles.label}>Your move</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.28)',
    borderStyle: 'dashed',
    borderRadius: tokens.radiusCard,
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  label: {
    color: tokens.yellow,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  text: {
    color: tokens.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
