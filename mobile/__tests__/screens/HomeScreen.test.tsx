import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {HomeScreen} from '../../src/screens/HomeScreen';

jest.mock('../../src/config', () => ({
  BASE_URL: 'https://example.com',
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

function makeNavigation(overrides = {}) {
  return {
    navigate: jest.fn(),
    setOptions: jest.fn(),
    goBack: jest.fn(),
    ...overrides,
  };
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the URL input and Analyze button', () => {
    const {getByTestId} = render(
      <HomeScreen navigation={makeNavigation() as any} route={{} as any} />,
    );
    expect(getByTestId('url-input')).toBeTruthy();
    expect(getByTestId('analyze-button')).toBeTruthy();
  });

  it('Analyze button is disabled when URL is empty', () => {
    const {getByTestId} = render(
      <HomeScreen navigation={makeNavigation() as any} route={{} as any} />,
    );
    const btn = getByTestId('analyze-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Analyze button is enabled when URL has content', () => {
    const {getByTestId} = render(
      <HomeScreen navigation={makeNavigation() as any} route={{} as any} />,
    );
    fireEvent.changeText(getByTestId('url-input'), 'https://example.com/article');
    expect(getByTestId('analyze-button').props.accessibilityState?.disabled).toBe(false);
  });

  it('navigates to Analysis with normalized URL on submit', () => {
    const nav = makeNavigation();
    const {getByTestId} = render(
      <HomeScreen navigation={nav as any} route={{} as any} />,
    );
    fireEvent.changeText(getByTestId('url-input'), 'example.com/article');
    fireEvent.press(getByTestId('analyze-button'));
    expect(nav.navigate).toHaveBeenCalledWith('Analysis', {
      url: 'https://example.com/article',
    });
  });

  it('does not navigate when URL is blank', () => {
    const nav = makeNavigation();
    const {getByTestId} = render(
      <HomeScreen navigation={nav as any} route={{} as any} />,
    );
    fireEvent.press(getByTestId('analyze-button'));
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('preserves an existing https:// prefix on navigate', () => {
    const nav = makeNavigation();
    const {getByTestId} = render(
      <HomeScreen navigation={nav as any} route={{} as any} />,
    );
    fireEvent.changeText(getByTestId('url-input'), 'https://bbc.com/news/story');
    fireEvent.press(getByTestId('analyze-button'));
    expect(nav.navigate).toHaveBeenCalledWith('Analysis', {
      url: 'https://bbc.com/news/story',
    });
  });
});
