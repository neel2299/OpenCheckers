const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// Room and WorkManager 2.9 create these through reflection during AndroidX
// Startup, before React Native renders. Keeping just the class names lets R8
// strip their no-argument constructors and makes release APKs close on launch.
module.exports = function withAndroidStartup(config) {
  return withDangerousMod(config, ['android', async result => {
    const target = path.join(result.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
    const marker = '# Draughts Club: AndroidX startup reflection';
    const contents = await fs.readFile(target, 'utf8');
    if (!contents.includes(marker)) await fs.writeFile(target, `${contents}\n${marker}\n-keep class * extends androidx.room.RoomDatabase { <init>(); }\n-keep class * extends androidx.work.InputMerger { <init>(); }\n`);
    return result;
  }]);
};
