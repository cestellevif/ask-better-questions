import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AnimatedHeaderTitle} from '../components/AnimatedHeaderTitle';
import {AnalysisScreen} from '../screens/AnalysisScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {TutorialScreen} from '../screens/TutorialScreen';
import {tokens} from '../theme/tokens';

export type RootStackParamList = {
  Home: undefined;
  Analysis: {url?: string};
  Tutorial: {fromHome?: boolean};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: tokens.bg},
        headerTintColor: tokens.yellow,
        headerTitleStyle: {fontWeight: '700'},
        contentStyle: {backgroundColor: tokens.bg},
        animation: 'fade',
        animationDuration: 280,
      }}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{title: 'Ask Better Questions'}}
      />
      <Stack.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{headerTitle: () => <AnimatedHeaderTitle text="Analyzing…" />}}
      />
      <Stack.Screen
        name="Tutorial"
        component={TutorialScreen}
        options={{headerShown: false, gestureEnabled: false}}
      />
    </Stack.Navigator>
  );
}
