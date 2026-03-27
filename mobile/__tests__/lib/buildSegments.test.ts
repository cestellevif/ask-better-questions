import {buildSegments} from '../../src/screens/ResultsScreen';

describe('buildSegments', () => {
  it('returns single unhighlighted segment when no excerpts', () => {
    const result = buildSegments('Hello world', []);
    expect(result).toEqual([{text: 'Hello world', highlight: false}]);
  });

  it('returns single unhighlighted segment when excerpt not found', () => {
    const result = buildSegments('Hello world', ['missing phrase']);
    expect(result).toEqual([{text: 'Hello world', highlight: false}]);
  });

  it('highlights a matching excerpt', () => {
    const result = buildSegments('Hello world foo', ['world']);
    expect(result).toEqual([
      {text: 'Hello ', highlight: false},
      {text: 'world', highlight: true},
      {text: ' foo', highlight: false},
    ]);
  });

  it('highlights excerpt at start of text', () => {
    const result = buildSegments('Hello world', ['Hello']);
    expect(result).toEqual([
      {text: 'Hello', highlight: true},
      {text: ' world', highlight: false},
    ]);
  });

  it('highlights excerpt at end of text', () => {
    const result = buildSegments('Hello world', ['world']);
    expect(result).toEqual([
      {text: 'Hello ', highlight: false},
      {text: 'world', highlight: true},
    ]);
  });

  it('highlights entire text when excerpt matches all', () => {
    const result = buildSegments('Hello world', ['Hello world']);
    expect(result).toEqual([{text: 'Hello world', highlight: true}]);
  });

  it('merges overlapping excerpt ranges', () => {
    const result = buildSegments('abcdef', ['abc', 'bcd']);
    // 'abc' → 0-3, 'bcd' → 1-4 → merged 0-4
    expect(result).toEqual([
      {text: 'abcd', highlight: true},
      {text: 'ef', highlight: false},
    ]);
  });

  it('handles multiple non-overlapping excerpts', () => {
    const result = buildSegments('foo bar baz', ['foo', 'baz']);
    expect(result).toEqual([
      {text: 'foo', highlight: true},
      {text: ' bar ', highlight: false},
      {text: 'baz', highlight: true},
    ]);
  });

  it('skips empty and null-ish excerpts', () => {
    const result = buildSegments('Hello world', ['', '  ']);
    expect(result).toEqual([{text: 'Hello world', highlight: false}]);
  });
});
