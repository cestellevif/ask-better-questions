// Inline mock for react-native-reanimated v4.
// The package ships ESM-only source; loading it via require() in Jest's CJS
// environment pulls in react-native-worklets which is also ESM, causing parse
// failures. This manual mock provides the same contract as src/mock.ts without
// importing the package.
jest.mock('react-native-reanimated', () => {
  const NOOP = () => {};
  const ID = t => t;

  // withTiming and withSpring call their callback synchronously with finished=true,
  // which matches the contract in src/mock.ts and makes rollOut(cb) call cb immediately.
  const withTiming = (toValue, _config, callback) => {
    callback?.(true);
    return toValue;
  };
  const withSpring = (toValue, _config, callback) => {
    callback?.(true);
    return toValue;
  };

  return {
    __esModule: true,
    useSharedValue: init => {
      const obj = {value: init};
      return obj;
    },
    useAnimatedStyle: worklet => worklet(),
    withTiming,
    withSpring,
    // runOnJS returns the function itself so it can be called as runOnJS(fn)()
    runOnJS: ID,
    cancelAnimation: NOOP,
    withDelay: (_ms, next) => next,
    withRepeat: ID,
    withSequence: () => 0,
    Easing: {
      linear: ID,
      ease: ID,
      bezier: () => ({factory: ID}),
    },
    createAnimatedComponent: ID,
    default: {
      View: require('react-native').View,
      Text: require('react-native').Text,
      Image: require('react-native').Image,
      createAnimatedComponent: ID,
    },
  };
});
