# OpenCheckers

A complete, local-first checkers application for Android, iPhone/iPad, and the web, built with Expo SDK 58, React Native, and TypeScript.

The app is branded as **OpenCheckers**. The supplied logo is preserved in `assets/logo.png`; the header, launcher, splash screen, and favicon use appropriately sized copies. Run `npm run branding:render` to regenerate them. The Android foreground includes extra padding for adaptive icon masks, and the splash background matches the logo's white canvas.

The application package identifier is `com.neel.checkers`. The release signing key and local storage keys are retained to preserve saved games and settings. New deep links use `opencheckers://`; existing `draughtsclub://` links remain supported.

## Run

Use Node.js 22.13 or newer.

```sh
npm install
npm start
```

Android uses a native AdMob module and needs a development or release build; Expo Go cannot run the rewarded ad integration. Use the native build instructions below. For the browser preview:

```sh
npm run web
```

On Windows PowerShell, use `npm.cmd` / `npx.cmd` if script execution policy blocks `npm` / `npx`.

## Included

- English/American, International (10 × 10), Russian, and Brazilian checkers.
- Six named computer opponents: Pip (400), Cleo (800), Jasper (1200), Vera (1600), Orion (2000), and Atlas (2400). Each has a personality description and a saved win/draw/loss record per variant. Elo labels are estimated difficulty presets.
- Automatic local Elo calculations against the computer (1200 initial rating per variant, K=32). Completed games retain the opponent, result, before/after rating, and PDN for review in Learn → Ratings & game history. Two-player results are archived without changing computer ratings. Legacy retained results migrate chronologically, and new history has no 20-game cutoff. Each archived game is stored separately to avoid a single oversized native storage row.
- A game-over sheet shows the saved rating and Elo change, with links to full-game analysis, matching game history, puzzles, a rematch, and new-game setup. Reopen the result from the board. Each computer opponent has an individual offline avatar in setup, beside the board, and in the result sheet.
- Chess-style coordinate moves in every variant: c3-d4 for a step and c3xe5xg7 for a multi-capture. Move history, hints, puzzles, engine lines, and shared games use coordinates; numeric legacy games remain importable. Coordinate labels stay visible when optional checkers square numbers are enabled. PDN exports explicitly declare algebraic notation.
- Settings → Personalize your club: live previews, room colors and photo backgrounds, board palettes and individual square/frame images, piece colors and images, and wood/linen/marble/dot finishes. All eight sound events, including Undo, have independent default/library/custom/mute choices and volume. Import short audio clips or pictures through the system file picker. Original files remain untouched; imports are saved in app documents on native and IndexedDB on web, with only small references in game preferences. Includes per-section resets, a full reset, and unused-file cleanup.
- Learn → Puzzles → level selection → a dedicated interactive board. 37 offline puzzles across five levels: 33 from the MIT-licensed [Shadow Checkers database](https://github.com/ShadowfetchStudio/shadow-checkers), plus four original lessons. Includes automatic defensive replies, multi-jump input, progressive hints, a move list, and a solution walkthrough. Viewing a solution does not award a solve. See [puzzle source and validation](assets/puzzles/README.md).
- A local engine with iterative deepening, alpha-beta pruning, transposition caching, capture extensions, and positional evaluation. Search yields every 128 nodes so board interactions remain responsive. Cancellation prevents an outdated search from playing into a new game.
- Computer play and local two-player pass-and-play, legal-move indicators, multi-jump input, promotion, hints, takebacks, resignation, and move review.
- An independent analysis board with candidate moves, principal variations, evaluation, a position graph, move navigation, and persistent branches. Go back and play a different move to create a variation; the original continuation remains available.
- **Computer analysis**, below the analysis board, is available for completed games and imported PDNs. Each explicit Analyse game or Run again request creates a separate saved analysis; only the last five requests are retained. Resume continues the same item, and opening an older analysis does not reorder the five. New analysis provides the saved library, completed-game selection, PDN import, and fresh position boards. The top-right evaluation follows the current board. The Main line and Variations controls preserve and reopen every line, while the full-game plot and running analysis stay attached to the original game even when you play a different move. Analyses, progress, variations, and the selected position survive reloads. Each analysis has its own storage record; creating a sixth removes the oldest record without touching game history. Position boards use live evaluation and do not consume saved-analysis slots. Move markers compare candidates within the same search, with estimated losses of 0.5, 1, and 2 men labelled inaccuracies, mistakes, and blunders.
- A touch-friendly position editor, numeric or algebraic FEN import, FEN copy, and PDN export of the selected line.
- Four board palettes plus custom colors and textures, numbered squares, phone/tablet layouts, and on-device storage of the current game, analysis, and preferences.
- A board-first mobile workspace with fixed Play / Analysis / Learn / Settings navigation. Labeled action buttons keep Undo, Hint, Analyze, Moves, Editor, and Import discoverable; setup and detailed tools open in focused bottom sheets. Navigation occupies its own layout space and never overlays controls.
- Dedicated game setup with visible opponent, variant, level, and side choices and a fixed Start button. Android Back cancels position editing or returns a reviewed game to live play; native sharing opens the phone's system share sheet.
- Bundled fonts and a custom app icon. Native gameplay and analysis run without a network connection.
- Native piece slides, selection springs, fading captures, crowning effects, and animated notifications. Motion respects the device's Reduce Motion setting.
- Kenney CC0 interface sounds and an original CC0 victory bell for player wins and solved puzzles. Sound, volume, vibration, and animations have separate saved controls. Audio mixes with other audio and stops in the background. The bell can be previewed in Settings; [source and licenses](assets/sounds/LICENSE.md) are included.
- A branded native splash screen and foreground-aware engine searches. Playback needs no microphone or storage permission.

## Optional developer support

Ads are currently disabled on every platform. All features, including the Royal Club palette and Royal textures, are free. The native ad SDK is excluded through react-native.config.js and its Expo plugins are disabled. The retained rewarded-ad code is dormant.

Each cold launch independently has a 25% chance of showing a dismissible donation sheet after saved settings load and the tutorial closes. Navigation and returning from the background do not reroll it. Settings also offers **Donate to the developer** at any time. Donations never unlock or restrict features.

- Worldwide donation page: [Buy Me a Coffee](https://buymeacoffee.com/nitruspeed).
- Devices using Asia/Kolkata or Asia/Calcutta show the developer-supplied UPI QR by default. This uses the device time zone as a hint, without GPS access or a location service. Anyone can switch payment options.
- The current QR is bundled as assets/donation-upi.jpg. Its decoded URI uses the developer's UPI alias and opens an installed UPI app on native; users can also copy the alias or scan/import the QR. No donation amount is preselected.
- The default room is dark green with dots. Untouched legacy rooms migrate to this default; custom rooms are retained.

### Engine strengths

| Estimated Elo | Name | Maximum depth | Search budget | Move selection |
| --- | --- | --- | --- | --- |
| 400 | Pip · The newcomer | 1 | 45 ms | Frequent mistakes |
| 800 | Cleo · The café regular | 2 | 90 ms | Occasional mistakes |
| 1200 | Jasper · The club captain | 4 | 180 ms | Small inaccuracies |
| 1600 | Vera · The tactician | 6 | 320 ms | Small evaluation variation |
| 2000 | Orion · The strategist | 8 | 550 ms | Near-deterministic |
| 2400 | Atlas · The master | 10 | 800 ms | Best completed search |

Capture extensions can search beyond the nominal depth. Actual depth varies with the position and device. Analysis uses a 1.1-second budget and a depth ceiling of 10. A positive score favors Ivory; +1.00 is approximately one man. These bounded searches do not prove that a move is optimal, and the app has no endgame tablebases or online rating system.

The position graph uses the static material/position evaluation. The engine panel shows the deeper search evaluation. Analysis can continue past a drawn position to explore possibilities.

## Android and Apple builds

For the requested **local Windows APK build**, the toolchain is kept in `.cache/` and the release signing key is stored in the ignored `.keys/` directory. After the local SDK/JDK are installed, run:

```sh
npm run build:android:local
```

The release output is `releases/OpenCheckers-1.0.0.apk` (Android build 17), with ARM64, ARMv7, and x86_64 libraries and its JavaScript/assets embedded, so it runs without Metro or Expo Go. The script regenerates native configuration through Expo, signs with the existing local release certificate, and copies the APK to `releases/`. Keep a private backup of `.keys/`; it is needed to sign compatible future updates. Do not commit or distribute that directory.

The build also runs `scripts/verify-apk.ps1`, including a DEX-level check that reflection-only WorkDatabase/InputMerger constructors survive R8, to check the release certificate, non-debuggable manifest, the phone architectures, 16 KiB ZIP alignment, Hermes bytecode, fonts, sounds, and permissions. It writes `releases/apk-verification.json` and an APK SHA-256 checksum. Verification does not install the app or replace testing on a physical phone.


The 1.6.1 startup fix is configured in `plugins/withAndroidStartup.cjs`. Release optimization had removed public constructors from WorkDatabase_Impl and WorkManager InputMerger classes, causing AndroidX Startup to crash before React Native loaded. `scripts/verify-android-startup.mjs` rejects affected APKs by inspecting their compiled DEX definitions. The 1.6.0 baseline fails this check. Keep these rules when upgrading AndroidX or changing release optimization.

Native signing is configured by `plugins/withReleaseSigning.cjs`; generated Android files are never maintained by hand. Downloads and build caches are ignored by Git. The helper scripts use official Google, Azul, and Gradle downloads with published checksums.

On Windows, the local build helper also updates the SDK's old bundled Ninja to a current official version when necessary. This avoids the native compiler's 260-character path limit without changing system settings. Its Gradle init script selects Clang's C++ driver explicitly, so linking also works when Windows abbreviates paths containing spaces. See [Expo's Windows build notes](https://docs.expo.dev/troubleshooting/windows-long-paths/).

Cloud builds remain available as an alternative:

Native identifiers (`com.neel.checkers`) and EAS profiles are configured in `app.json` and `eas.json`.

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npm run build:android
npm run build:ios
```

The Android preview profile produces an installable APK. The iOS production profile produces an App Store/TestFlight build. EAS builds require an Expo account and signing credentials; iOS store builds also require Apple Developer membership. EAS can build iOS in the cloud from Windows. See the [Expo build documentation](https://docs.expo.dev/deploy/build-project/).

For Google Play, build the production Android App Bundle:

```sh
npx eas-cli@latest build --platform android --profile production
```

No store submissions or remote builds are performed. Native device/simulator testing remains necessary before public release. The web preview does not replace device testing.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npx expo export --platform web
```

With the development server running on port 8081, run browser interaction tests:

```sh
npx playwright test
```

The test configuration uses the installed Microsoft Edge browser and tests both a desktop and a 390-pixel phone viewport. Layout checks also verify that labeled controls stay above the tab bar at 360 × 640, 390 × 844, and 844 × 390. Change `channel` in `playwright.config.ts` for another browser. `node scripts/preview.mjs` saves phone, small-phone, landscape, desktop, and analysis screenshots to `artifacts/`.

Engine tests cover all opening setups, compulsory and maximum captures, backward captures, mid-sequence crowning, flying kings, captured-piece blockers, terminal/drawn positions, FEN validation, PDN notation, cancellation, all six search levels, and complete legal playouts. UI tests cover computer replies, game persistence, takebacks, variants, level selection, analysis branches, position editing, preferences, panel navigation, canceled setup changes, return to live play, engine pause, and candidate move execution.

Native JavaScript bundles can also be checked with `npx expo export --platform all --no-bytecode`; this does not generate installable apps. The local release APK build uses Hermes bytecode and the Android native toolchain.

The SDK's development-tool dependencies currently report npm advisories involving Zod and deepmerge. The automatic audit suggestion downgrades Expo to SDK 51, so it has not been applied. Recheck upstream SDK patches before release.

## Source map

- `src/game/engine.ts` — rules, moves, outcomes, FEN.
- `src/game/ai.ts` — evaluation and asynchronous search.
- `src/game/variants.ts` — variants and level tuning.
- `src/game/pdn.ts` — interoperable game export.
- `src/state/GameContext.tsx` — game trees and persistence.
- `src/state/preferences.ts` — version-compatible preference defaults and restoration.
- `src/feedback/` — lifecycle-managed audio and haptic feedback.
- `src/hooks/` — reduced-motion, app lifecycle, and move-feedback hooks.
- `src/components/board/` — isolated piece and move animation components.
- `src/components/mobile/` — labeled actions, keyboard-aware tool sheets, new-game setup, and settings/help page layout.
- `src/app/` — Expo Router screens.
- `src/components/` — shared native/web interface.

Movement and capture rules follow [WCDF English rules](https://wcdf.net/rules/rules_of_checkers_english.pdf), [FMJD International rules](https://www.fmjd.org/docs/Annex_1.pdf), and [IDF 64-square rules](https://idf64.org/wp-content/uploads/2016/09/Official-Rules-of-the-game.pdf). Notation follows the [PDN standard](https://wiegerw.github.io/pdn/gametype.html). Tournament-only procedures such as touch-move penalties, clocks, adjudication, and agreed draws are outside this untimed local app.
