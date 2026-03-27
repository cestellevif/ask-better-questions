import {analyzeUrl} from '../../src/api/questions';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function ndjson(...events: object[]): Response {
  const body = events.map(e => JSON.stringify(e)).join('\n');
  return {
    ok: true,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

const mockBundle = {
  fast: [{label: 'Words', text: 'q1', why: 'w1'}],
  deeper: [{label: 'Proof', text: 'q2', why: 'w2'}],
  cliff: [{label: 'Missing', text: 'q3', why: 'w3'}],
};

beforeEach(() => mockFetch.mockReset());

describe('analyzeUrl', () => {
  it('calls onProgress for each progress event', async () => {
    mockFetch.mockResolvedValueOnce(ndjson(
      {type: 'progress', stage: 'Fetching\u2026'},
      {type: 'progress', stage: 'Extracting\u2026'},
      {type: 'result', data: {bundle: mockBundle}},
    ));
    const stages: string[] = [];
    await analyzeUrl('https://example.com', null, s => stages.push(s), new AbortController().signal);
    expect(stages).toEqual(['Fetching\u2026', 'Extracting\u2026']);
  });

  it('returns result with bundle and articleText', async () => {
    mockFetch.mockResolvedValueOnce(ndjson(
      {type: 'result', data: {bundle: mockBundle, articleText: 'Article body'}},
    ));
    const result = await analyzeUrl('https://example.com', null, () => {}, new AbortController().signal);
    expect(result).toEqual({type: 'result', bundle: mockBundle, meter: undefined, articleText: 'Article body'});
  });

  it('returns result without articleText when field is missing', async () => {
    mockFetch.mockResolvedValueOnce(ndjson(
      {type: 'result', data: {bundle: mockBundle}},
    ));
    const result = await analyzeUrl('https://example.com', null, () => {}, new AbortController().signal);
    expect(result).toMatchObject({type: 'result', bundle: mockBundle});
    expect((result as any).articleText).toBeUndefined();
  });

  it('returns choice result when server sends choice event', async () => {
    const candidates = [{title: 'Story 1', url: 'https://example.com/1', score: 90, snippet: '\u2026'}];
    mockFetch.mockResolvedValueOnce(ndjson(
      {type: 'choice', data: {sourceUrl: 'https://example.com', candidates}},
    ));
    const result = await analyzeUrl('https://example.com', null, () => {}, new AbortController().signal);
    expect(result).toEqual({type: 'choice', sourceUrl: 'https://example.com', candidates});
  });

  it('returns error result when server sends error event', async () => {
    mockFetch.mockResolvedValueOnce(ndjson(
      {type: 'error', error: 'Could not extract article.'},
    ));
    const result = await analyzeUrl('https://example.com', null, () => {}, new AbortController().signal);
    expect(result).toEqual({type: 'error', error: 'Could not extract article.'});
  });

  it('appends detail to error when present', async () => {
    mockFetch.mockResolvedValueOnce(ndjson(
      {type: 'error', error: 'Extraction failed', detail: 'paywall detected'},
    ));
    const result = await analyzeUrl('https://example.com', null, () => {}, new AbortController().signal);
    expect(result).toEqual({type: 'error', error: 'Extraction failed (paywall detected)'});
  });

  it('returns error when fetch throws (network failure)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await analyzeUrl('https://example.com', null, () => {}, new AbortController().signal);
    expect(result).toEqual({type: 'error', error: 'Could not reach the server.'});
  });

  it('returns error when server responds with non-OK status', async () => {
    mockFetch.mockResolvedValueOnce({ok: false, status: 500} as Response);
    const result = await analyzeUrl('https://example.com', null, () => {}, new AbortController().signal);
    expect(result).toEqual({type: 'error', error: 'Server error 500.'});
  });

  it('skips malformed JSON lines without throwing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('not json\n' + JSON.stringify({type: 'result', data: {bundle: mockBundle}})),
    } as unknown as Response);
    const result = await analyzeUrl('https://example.com', null, () => {}, new AbortController().signal);
    expect(result).toMatchObject({type: 'result'});
  });

  it('returns "No result received" error when response has no result event', async () => {
    mockFetch.mockResolvedValueOnce(ndjson(
      {type: 'progress', stage: 'Thinking\u2026'},
    ));
    const result = await analyzeUrl('https://example.com', null, () => {}, new AbortController().signal);
    expect(result).toEqual({type: 'error', error: 'No result received.'});
  });

  it('passes chosenUrl in request body when provided', async () => {
    mockFetch.mockResolvedValueOnce(ndjson(
      {type: 'result', data: {bundle: mockBundle}},
    ));
    await analyzeUrl('https://example.com', 'https://example.com/story', () => {}, new AbortController().signal);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.chosenUrl).toBe('https://example.com/story');
  });
});
