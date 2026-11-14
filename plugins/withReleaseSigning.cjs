const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, result => {
    const marker = '// Draughts Club: local release signing';
    if (!result.modResults.contents.includes(marker)) {
      result.modResults.contents += `
${marker}
if (System.getenv("DRAUGHTS_KEYSTORE_PATH")) {
    android {
        signingConfigs {
            localRelease {
                storeFile file(System.getenv("DRAUGHTS_KEYSTORE_PATH"))
                storePassword System.getenv("DRAUGHTS_KEYSTORE_PASSWORD")
                keyAlias "draughts-club"
                keyPassword System.getenv("DRAUGHTS_KEYSTORE_PASSWORD")
            }
        }
        buildTypes.release.signingConfig = signingConfigs.localRelease
    }
}
`;
    }
    return result;
  });
};
