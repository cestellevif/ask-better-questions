import {renderHook, act} from '@testing-library/react-native';
import {useAnalysis} from '../../src/hooks/useAnalysis';
import {analyzeUrl, pingBothServices} from '../../src/api/questions';

jest.mock('../../src/api/questions');
const mockAnalyzeUrl = analyzeUrl as jest.MockedFunction<typeof analyzeUrl>;
const mockPing = pingBothServices as jest.MockedFunction<typeof pingBothServices>;

const mockBundle = {
  fast: [{label: 'Words', text: 'q1', why: 'w1'}],
  deeper: [{label: 'Proof', text: 'q2', why: 'w2'}],
  cliff: [{label: 'Missing', text: 'q3', why: 'w3'}],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Default: ping resolves false (server cold) so warmup stays
  mockPing.mockResolvedValue(false);
});

afterEach(() => jest.useRealTimers());

describe('useAnalysis', () => {
  it('starts in idle phase', () => {
    const {result} = renderHook(() => useAnalysis());
    expect(result.current.phase.kind).toBe('idle');
  });

  it('transitions to warmup immediately on run()', async () => {
    mockAnalyzeUrl.mockResolvedValue({type: 'result', bundle: mockBundle});
    const {result} = renderHook(() => useAnalysis());
    act(() => { result.current.run('https://example.com'); });
    expect(result.current.phase.kind).toBe('warmup');
  });

  it('transitions to result phase on successful analysis', async () => {
    mockAnalyzeUrl.mockResolvedValue({type: 'result', bundle: mockBundle, articleText: 'Body'});
    const {result} = renderHook(() => useAnalysis());
    await act(async () => { await result.current.run('https://example.com'); });
    expect(result.current.phase).toEqual({
      kind: 'result',
      bundle: mockBundle,
      meter: undefined,
      articleText: 'Body',
    });
  });

  it('transitions to choice phase when server returns candidates', async () => {
    const candidates = [{title: 'Story', url: 'https://example.com/1', score: 90, snippet: '\u2026'}];
    mockAnalyzeUrl.mockResolvedValue({type: 'choice', sourceUrl: 'https://example.com', candidates});
    const {result} = renderHook(() => useAnalysis());
    await act(async () => { await result.current.run('https://example.com'); });
    expect(result.current.phase.kind).toBe('choice');
  });

  it('transitions to error phase on failure', async () => {
    mockAnalyzeUrl.mockResolvedValue({type: 'error', error: 'Could not extract.'});
    const {result} = renderHook(() => useAnalysis());
    await act(async () => { await result.current.run('https://example.com'); });
    expect(result.current.phase).toEqual({kind: 'error', message: 'Could not extract.'});
  });

  it('transitions to error phase when analyzeUrl throws', async () => {
    mockAnalyzeUrl.mockRejectedValue(new Error('Unexpected'));
    const {result} = renderHook(() => useAnalysis());
    await act(async () => { await result.current.run('https://example.com'); });
    expect(result.current.phase).toEqual({kind: 'error', message: 'Unexpected'});
  });

  it('updates warmup stage to "Waking up server\u2026" after 5 seconds', async () => {
    // analyzeUrl never resolves (simulates slow server)
    mockAnalyzeUrl.mockReturnValue(new Promise(() => {}));
    const {result} = renderHook(() => useAnalysis());
    act(() => { result.current.run('https://example.com'); });
    expect(result.current.phase).toMatchObject({kind: 'warmup', stage: 'Starting up\u2026'});
    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.phase).toMatchObject({kind: 'warmup', stage: 'Waking up server\u2026'});
  });

  it('skips to loading immediately when ping succeeds', async () => {
    mockPing.mockResolvedValue(true);
    mockAnalyzeUrl.mockResolvedValue({type: 'result', bundle: mockBundle});
    const {result} = renderHook(() => useAnalysis());
    await act(async () => { result.current.run('https://example.com'); });
    // After ping resolves, should be loading or result (not warmup)
    expect(result.current.phase.kind).not.toBe('warmup');
  });

  it('ignores AbortError and does not set error phase', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    mockAnalyzeUrl.mockRejectedValue(abortError);
    const {result} = renderHook(() => useAnalysis());
    await act(async () => { await result.current.run('https://example.com'); });
    // Should stay in warmup (abort happened mid-flight, no error state)
    expect(result.current.phase.kind).not.toBe('error');
  });
});
