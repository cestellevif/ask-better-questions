import React, {useMemo} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown, FadeOutUp} from 'react-native-reanimated';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {tokens} from '../theme/tokens';

const STAGGER_MS = 28;

interface Props {
  text: string;
}

export function AnimatedHeaderTitle({text}: Props) {
  const reduceMotion = useReducedMotion();

  // Split into words; track each char's global index for stagger delay
  const words = useMemo(() => {
    let charIndex = 0;
    return text.split(' ').map((word, wi, arr) => ({
      chars: Array.from(word).map(ch => ({ch, index: charIndex++})),
      addSpace: wi < arr.length - 1,
    }));
  }, [text]);

  return (
    <View style={styles.row} accessibilityLabel={text}>
      {words.map((word, wi) => (
        <View key={wi} style={styles.word}>
          {word.chars.map(({ch, index}) =>
            reduceMotion ? (
              <Text key={index} style={styles.char}>
                {ch}
              </Text>
            ) : (
              <Animated.Text
                key={`${text}-${index}`}
                entering={FadeInDown.delay(index * STAGGER_MS)
                  .springify()
                  .damping(22)
                  .stiffness(280)}
                exiting={FadeOutUp.duration(110)}
                style={styles.char}>
                {ch}
              </Animated.Text>
            ),
          )}
          {word.addSpace && <Text style={styles.char}> </Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  word: {
    flexDirection: 'row',
  },
  char: {
    color: tokens.yellow,
    fontSize: Platform.OS === 'ios' ? 17 : 18,
    fontWeight: '700',
  },
});
