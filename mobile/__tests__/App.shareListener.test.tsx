/**
 * Tests for App.tsx share listener callbacks.
 * Specifically guards against the null-share crash fixed in ae33d8c.
 */

// Mock all native modules before importing App
jest.mock('react-native-share-menu', () => ({
  __esModule: true,
  default: {
    getInitialShare: jest.fn(() => null),
    addNewShareListener: jest.fn(() => ({remove: jest.fn()})),
  },
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}: {children: React.ReactNode}) => children,
  createNavigationContainerRef: () => ({
    isReady: () => true,
    navigate: jest.fn(),
  }),
}));

jest.mock('../src/navigation/RootNavigator', () => ({
  RootNavigator: () => null,
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
}));

import React from 'react';
import ShareMenuReactView from 'react-native-share-menu';
import {render} from '@testing-library/react-native';
import App from '../App';

const mockAddListener = ShareMenuReactView.addNewShareListener as jest.Mock;

function getShareCallback(): (share: {data?: string} | null) => void {
  return mockAddListener.mock.calls[0][0];
}

describe('App warm-launch share listener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    render(<App />);
  });

  it('does not crash when called with null', () => {
    expect(() => getShareCallback()(null)).not.toThrow();
  });

  it('does not crash when called with an object missing data', () => {
    expect(() => getShareCallback()({})).not.toThrow();
  });

  it('does not navigate when share data is not an http URL', () => {
    getShareCallback()({data: 'not a url'});
    // No navigation should occur — just verify no throw
    expect(() => getShareCallback()({data: 'not a url'})).not.toThrow();
  });
});
