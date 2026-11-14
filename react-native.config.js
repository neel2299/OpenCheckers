// Retain the package for future use without including its native SDK while ads are paused.
module.exports = {
  dependencies: { 'react-native-google-mobile-ads': { platforms: { android: null, ios: null } } },
};
