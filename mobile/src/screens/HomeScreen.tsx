import React, {useEffect, useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {tokens} from '../theme/tokens';
import {normalizeUrl} from '../utils/url';
import {BASE_URL} from '../config';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({navigation}: Props) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Tutorial', {fromHome: true})}
          accessibilityRole="button"
          accessibilityLabel="Open tutorial"
          accessibilityHint="Opens the tutorial and how-to guide"
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          style={{marginRight: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{color: tokens.muted, fontSize: 18}}>ⓘ</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleAnalyze = () => {
    if (!url.trim()) return;
    Keyboard.dismiss();
    navigation.navigate('Analysis', {url: normalizeUrl(url)});
  };

  return (
    <KeyboardAvoidingView
      style={styles.kavWrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Paste an article URL to analyze it, or share one from your browser.
      </Text>

      <Text style={styles.inputLabel}>Article URL</Text>
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
        accessibilityHint={url.trim() ? 'Analyzes the article at the entered URL' : 'Paste or type the complete article URL first'}
        accessibilityState={{disabled: !url.trim()}}>
        <Text style={styles.btnText}>Analyze</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.privacyLink}
        onPress={() => Linking.openURL(`${BASE_URL}/privacy`)}
        accessibilityRole="link"
        accessibilityLabel="View privacy policy">
        <Text style={styles.privacyLinkText}>Privacy Policy</Text>
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
  inputLabel: {
    color: tokens.muted,
    fontSize: 12,
    marginBottom: 6,
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
  privacyLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  privacyLinkText: {
    color: tokens.muted,
    fontSize: 12,
    opacity: 0.7,
  },
});
