import React, {useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {tokens} from '../theme/tokens';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({navigation}: Props) {
  const [url, setUrl] = useState('');

  const handleAnalyze = () => {
    let trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    Keyboard.dismiss();
    navigation.navigate('Analysis', {url: trimmed});
  };

  return (
    <KeyboardAvoidingView
      style={styles.kavWrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Paste an article URL to analyze it, or share one from your browser.
      </Text>

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
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kavWrapper: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  container: {
    flex: 1,
    backgroundColor: tokens.bg,
    padding: 24,
    justifyContent: 'center',
  },
  subtitle: {
    color: tokens.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 28,
  },
  input: {
    backgroundColor: tokens.card,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: tokens.fg,
    fontSize: 14,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: tokens.yellow,
    borderRadius: tokens.radiusPill,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
});
