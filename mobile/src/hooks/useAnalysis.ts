import {useCallback, useEffect, useRef, useState} from 'react';
import {pingBothServices, analyzeUrl} from '../api/questions';
import type {Bundle, ExtractCandidate} from '../types/api';

export type Phase =
  | {kind: 'idle'}
  | {kind: 'warmup'; stage: string}
  | {kind: 'loading'; stage: string}
  | {kind: 'choice'; candidates: ExtractCandidate[]; sourceUrl: string}
  | {kind: 'result'; bundle: Bundle; articleText?: string}
  | {kind: 'error'; message: string};

export function useAnalysis() {
  const [phase, setPhase] = useState<Phase>({kind: 'idle'});
  const abortRef = useRef<AbortController | null>(null);
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any in-flight request and pending timers on unmount
  useEffect(() => () => {
    abortRef.current?.abort();
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
  }, []);

  const run = useCallback(async (url: string, chosenUrl: string | null = null) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase({kind: 'warmup', stage: 'Starting up…'});

    let warmupSkipped = false;

    // Ping both services — if both respond in 3s, skip warmup entirely.
    // Guard on controller so a stale ping from a previous run() call can't fire.
    pingBothServices().then(alive => {
      if (controller.signal.aborted) return;
      if (alive && !warmupSkipped) {
        warmupSkipped = true;
        setPhase({kind: 'loading', stage: 'Fetching page…'});
      }
    });

    // After 5s, switch warmup stage to "Let's have a look…" if still waiting
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
    wakeTimerRef.current = setTimeout(() => {
      setPhase(p =>
        p.kind === 'warmup' ? {kind: 'warmup', stage: 'Let\'s have a look…'} : p,
      );
    }, 5000);

    const clearWakeTimer = () => {
      if (wakeTimerRef.current) {
        clearTimeout(wakeTimerRef.current);
        wakeTimerRef.current = null;
      }
    };

    try {
      const result = await analyzeUrl(
        url,
        chosenUrl,
        stage => {
          warmupSkipped = true;
          clearWakeTimer();
          setPhase({kind: 'loading', stage});
        },
        controller.signal,
      );

      clearWakeTimer();

      if (result.type === 'result') {
        setPhase({kind: 'result', bundle: result.bundle, articleText: result.articleText});
      } else if (result.type === 'choice') {
        setPhase({
          kind: 'choice',
          candidates: result.candidates,
          sourceUrl: result.sourceUrl,
        });
      } else {
        setPhase({kind: 'error', message: result.error});
      }
    } catch (e: unknown) {
      clearWakeTimer();
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      setPhase({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Unknown error.',
      });
    }
  }, []);

  return {phase, run};
}
