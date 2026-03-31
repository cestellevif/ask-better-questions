import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {AnimatedHeaderTitle} from '../components/AnimatedHeaderTitle';
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
  }, [phase, rollOut]);

  // Accessibility announcements — use real-time `phase` (not displayedPhase)
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

    navigation.setOptions({
      headerTitle: () => <AnimatedHeaderTitle text={title} />,
    });
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
