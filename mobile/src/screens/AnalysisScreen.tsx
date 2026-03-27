import React, {useEffect} from 'react';
import {AccessibilityInfo, View} from 'react-native';
import {CandidateList} from '../components/CandidateList';
import {ErrorBanner} from '../components/ErrorBanner';
import {WarmupScreen} from '../components/WarmupScreen';
import {useAnalysis} from '../hooks/useAnalysis';
import {tokens} from '../theme/tokens';
import {ResultsScreen} from './ResultsScreen';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Analysis'>;

export function AnalysisScreen({route, navigation}: Props) {
  const urlFromNav = route.params?.url;
  const {phase, run} = useAnalysis();

  // Update header title and announce phase transitions to screen readers
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

  // Re-run whenever the URL param changes (navigated here + share while open)
  useEffect(() => {
    if (urlFromNav) {
      run(urlFromNav);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFromNav]);

  if (phase.kind === 'warmup' || phase.kind === 'loading') {
    return <WarmupScreen stage={phase.stage} />;
  }

  if (phase.kind === 'choice') {
    return (
      <CandidateList
        candidates={phase.candidates}
        onPick={chosenUrl => run(phase.sourceUrl, chosenUrl)}
      />
    );
  }

  if (phase.kind === 'result') {
    return <ResultsScreen bundle={phase.bundle} meter={phase.meter} articleText={phase.articleText} />;
  }

  if (phase.kind === 'error') {
    return (
      <ErrorBanner
        message={phase.message}
        onRetry={() => navigation.goBack()}
      />
    );
  }

  // idle — nothing shown yet
  return <View style={{flex: 1, backgroundColor: tokens.bg}} />;
}
