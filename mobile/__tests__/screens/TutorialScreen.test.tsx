import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {TutorialScreen} from '../../src/screens/TutorialScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '../../src/storage/keys';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
  },
}));

const SLIDE_COUNT = 6;

function makeNavigation(overrides = {}) {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    ...overrides,
  };
}

function makeRoute(params: Record<string, unknown> = {}) {
  return {params, key: 'Tutorial', name: 'Tutorial' as const};
}

describe('TutorialScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the first slide headline on mount', () => {
    const {getByText} = render(
      <TutorialScreen navigation={makeNavigation() as any} route={makeRoute() as any} />,
    );
    expect(getByText('Read smarter, ask better')).toBeTruthy();
  });

  it('shows "Next →" button on first slide', () => {
    const {getByText} = render(
      <TutorialScreen navigation={makeNavigation() as any} route={makeRoute() as any} />,
    );
    expect(getByText('Next →')).toBeTruthy();
  });

  it('shows "Skip" before the last slide', () => {
    const {getByText} = render(
      <TutorialScreen navigation={makeNavigation() as any} route={makeRoute() as any} />,
    );
    expect(getByText('Skip')).toBeTruthy();
  });

  it('advances to second slide when Next is pressed', () => {
    const {getByText} = render(
      <TutorialScreen navigation={makeNavigation() as any} route={makeRoute() as any} />,
    );
    fireEvent.press(getByText('Next →'));
    expect(getByText('Paste a link, get questions')).toBeTruthy();
  });

  it('shows "Get started →" on last slide and hides Skip', () => {
    const {getByText, queryByText} = render(
      <TutorialScreen navigation={makeNavigation() as any} route={makeRoute() as any} />,
    );
    for (let i = 0; i < SLIDE_COUNT - 1; i++) {
      fireEvent.press(getByText('Next →'));
    }
    expect(getByText('Get started →')).toBeTruthy();
    expect(queryByText('Skip')).toBeNull();
  });

  it('writes TUTORIAL_SEEN to AsyncStorage on Get started', async () => {
    const nav = makeNavigation();
    const {getByText} = render(
      <TutorialScreen navigation={nav as any} route={makeRoute() as any} />,
    );
    for (let i = 0; i < SLIDE_COUNT - 1; i++) {
      fireEvent.press(getByText('Next →'));
    }
    fireEvent.press(getByText('Get started →'));
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.TUTORIAL_SEEN, '1');
    });
  });

  it('calls navigation.reset when fromHome is false', async () => {
    const nav = makeNavigation();
    const {getByText} = render(
      <TutorialScreen navigation={nav as any} route={makeRoute() as any} />,
    );
    for (let i = 0; i < SLIDE_COUNT - 1; i++) {
      fireEvent.press(getByText('Next →'));
    }
    fireEvent.press(getByText('Get started →'));
    await waitFor(() => {
      expect(nav.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{name: 'Home'}],
      });
    });
  });

  it('calls navigation.goBack when fromHome is true', async () => {
    const nav = makeNavigation();
    const {getByText} = render(
      <TutorialScreen navigation={nav as any} route={makeRoute({fromHome: true}) as any} />,
    );
    for (let i = 0; i < SLIDE_COUNT - 1; i++) {
      fireEvent.press(getByText('Next →'));
    }
    fireEvent.press(getByText('Get started →'));
    await waitFor(() => {
      expect(nav.goBack).toHaveBeenCalled();
      expect(nav.reset).not.toHaveBeenCalled();
    });
  });

  it('Skip calls complete and writes TUTORIAL_SEEN', async () => {
    const nav = makeNavigation();
    const {getByText} = render(
      <TutorialScreen navigation={nav as any} route={makeRoute() as any} />,
    );
    fireEvent.press(getByText('Skip'));
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.TUTORIAL_SEEN, '1');
    });
  });
});
