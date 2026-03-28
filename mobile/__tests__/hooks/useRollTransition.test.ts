import {renderHook, act} from '@testing-library/react-native';
import {useRollTransition} from '../../src/hooks/useRollTransition';

describe('useRollTransition', () => {
  it('returns style and rollOut', () => {
    const {result} = renderHook(() => useRollTransition());
    expect(result.current.style).toBeDefined();
    expect(typeof result.current.rollOut).toBe('function');
  });

  it('calls the callback when rollOut is invoked', () => {
    const {result} = renderHook(() => useRollTransition());
    const cb = jest.fn();
    act(() => {
      result.current.rollOut(cb);
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does not crash when rollOut is called multiple times', () => {
    const {result} = renderHook(() => useRollTransition());
    const cb = jest.fn();
    expect(() => {
      act(() => result.current.rollOut(cb));
      act(() => result.current.rollOut(cb));
    }).not.toThrow();
    expect(cb).toHaveBeenCalledTimes(2);
  });
});
