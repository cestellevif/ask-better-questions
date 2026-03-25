import React, {useEffect} from 'react';
import {View} from 'react-native';
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

  // Update header title to reflect current phase
  useEffect(() => {
    if (phase.kind === 'result') {
      navigation.setOptions({title: 'Results'});
    } else if (phase.kind === 'choice') {
      navigation.setOptions({title: 'Choose article'});
    } else if (phase.kind === 'error') {
      navigation.setOptions({title: 'Error'});
    } else {
      navigation.setOptions({title: 'Analyzing…'});
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
