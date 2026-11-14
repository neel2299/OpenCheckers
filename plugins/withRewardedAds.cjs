const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// Keep the UMP consent SDK if release shrinking is enabled, including after CNG.
module.exports = function withRewardedAds(config) {
  return withDangerousMod(config, ['android', async result => {
    const target = path.join(result.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
    const marker = '# Draughts Club: rewarded-ad consent';
    const contents = await fs.readFile(target, 'utf8');
    if (!contents.includes(marker)) await fs.writeFile(target, `${contents}\n${marker}\n-keep class com.google.android.gms.internal.consent_sdk.** { *; }\n`);
    return result;
  }]);
};
