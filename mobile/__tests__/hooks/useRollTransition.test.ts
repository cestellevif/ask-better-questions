import {renderHook, act} from '@testing-library/react-native';
import {AccessibilityInfo} from 'react-native';
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

  it('calls callback immediately when reduceMotion is enabled', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    const {result} = renderHook(() => useRollTransition());
    // Wait for the async isReduceMotionEnabled to resolve
    await act(async () => {});
    const cb = jest.fn();
    act(() => {
      result.current.rollOut(cb);
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('style has opacity and transform properties', () => {
    const {result} = renderHook(() => useRollTransition());
    expect(result.current.style).toHaveProperty('opacity');
    expect(result.current.style).toHaveProperty('transform');
  });
});
