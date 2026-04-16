import React, {useEffect, useRef} from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer, createNavigationContainerRef, DarkTheme} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ShareMenuReactView from 'react-native-share-menu';
import {RootNavigator} from './src/navigation/RootNavigator';
import type {RootStackParamList} from './src/navigation/RootNavigator';
import {isHttpUrl} from './src/utils/url';
import {STORAGE_KEYS} from './src/storage/keys';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

const NAV_THEME = {
  ...DarkTheme,
  colors: {...DarkTheme.colors, background: '#0f0f10'},
};

export default function App() {
  // Holds a URL from getInitialShare() that arrived before navigation was ready
  const pendingUrlRef = useRef<string | null>(null);

  // Cold launch: app opened via share sheet from a closed state.
  // getInitialShare() returns undefined on a normal open (no share intent),
  // so we guard before calling .then().
  useEffect(() => {
    const p = ShareMenuReactView.getInitialShare();
    if (!p) return;
    p.then((share: {data?: string} | null) => {
      const url = share?.data;
      if (!isHttpUrl(url)) return;
      if (navigationRef.isReady()) {
        navigationRef.navigate('Analysis', {url});
      } else {
        pendingUrlRef.current = url;
      }
    }).catch(() => {});
  }, []);

  // Warm launch: share while app is already open
  useEffect(() => {
    const listener = ShareMenuReactView.addNewShareListener(
      (share: {data?: string} | null) => {
        if (isHttpUrl(share?.data)) {
          navigationRef.navigate('Analysis', {url: share.data});
        }
      },
    );
    return () => listener.remove();
  }, []);

  async function handleNavigationReady() {
    // Show tutorial on first launch; share-intent navigation runs after
    const seen = await AsyncStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN);
    if (!seen) {
      navigationRef.reset({routes: [{name: 'Tutorial'}]});
      return;
    }
    const url = pendingUrlRef.current;
    if (url) {
      pendingUrlRef.current = null;
      navigationRef.navigate('Analysis', {url});
    }
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f10" />
        <NavigationContainer ref={navigationRef} onReady={handleNavigationReady} theme={NAV_THEME}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
