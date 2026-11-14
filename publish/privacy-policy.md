# Privacy Policy — OpenCheckers

**Effective Date:** November 1, 2026  
**Application Name:** OpenCheckers (`com.neel.checkers`)

OpenCheckers is designed from the ground up as a local-first, offline-capable checkers and draughts application. We respect your privacy and do not collect, store, sell, or transmit your personal data to any developer-operated server.

---

## 1. Information We Do Not Collect

OpenCheckers **does not** require an account, login, or internet connection to play, solve puzzles, or analyze games. Specifically, we do **not** collect or transmit:
- Personal identifiers (name, email address, phone number, or account ID)
- Precise or coarse GPS/network location data
- Contacts, call logs, messages, or calendar entries
- Microphone recordings or camera captures
- Advertising identifiers, analytics telemetry, or behavioral tracking profiles

---

## 2. Information Stored Locally on Your Device

To provide gameplay continuity and personalization, OpenCheckers stores the following data **exclusively on your device** (using Android local app storage / `AsyncStorage` and the app's private document directory):
- **Active and Completed Games:** Board states, move histories, PDN game records, local Elo ratings against computer opponents, and up to five saved full-game computer analyses.
- **Puzzle Progress:** Solved puzzle records and difficulty progression.
- **Preferences & Customizations:** Selected board variant, theme colors, sound/vibration toggles, and any custom audio clips or images you explicitly select via the system file picker for board/room personalization.

### How User-Imported Files Are Handled
When you choose a custom image (for board squares, pieces, or room backgrounds) or a short audio clip (for move/capture sounds) using your device's system file picker:
1. The selected file is copied into OpenCheckers' private on-device application directory.
2. It is **never** uploaded to any external server or shared with third parties.
3. You can remove imported customizations at any time via **Settings → Personalize your club → Reset** or by clearing app storage/uninstalling the app.

---

## 3. Optional Developer Support (Donations)

OpenCheckers is free to use with all features unlocked. The app includes an optional "Donate to the developer" sheet that you can dismiss at any time or open from Settings:
- **Local Timezone Check (On-Device Only):** To display the most relevant payment option by default (UPI QR code for users in India vs. Buy Me a Coffee internationally), the app checks your device's local timezone string (`Asia/Kolkata` or `Asia/Calcutta`) solely within the app on your device. This timezone value is never transmitted off your device.
- **External Payment Links:** If you choose to tap the **Buy Me a Coffee** link (`https://buymeacoffee.com/nitruspeed`) or open an installed **UPI payment app** via a standard `upi://pay` link, you will be directed to that external website or payment application. Any transaction you complete there is governed by the privacy policy and terms of that respective payment provider. OpenCheckers does not receive or store your payment card, bank account, or billing details.

---

## 4. Permissions Requested

OpenCheckers minimizes Android permissions and explicitly blocks unnecessary sensitive permissions in its manifest:
- **No Microphone Permission** (`android.permission.RECORD_AUDIO` is blocked)
- **No Broad External Storage Permission** (`READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` are blocked; custom file imports use the Android system document picker, which grants one-time scoped access only to the specific file you choose)
- **Vibration / Haptics:** Used locally for optional tactile move feedback (controllable in Settings).

---

## 5. Children's Privacy

Because OpenCheckers does not collect, store, or transmit any personal information from any user, we do not knowingly or unknowingly collect personal data from children under the age of 13 (or the applicable age of digital consent in your jurisdiction).

---

## 6. Data Retention and Deletion

All app data resides locally on your device. You have full control to delete this data at any time by:
- Using the reset options inside **Settings**
- Clearing the app's storage in your Android device settings (**Settings → Apps → OpenCheckers → Storage → Clear storage**)
- Uninstalling the application, which permanently deletes all locally stored games, analyses, and custom files

---

## 7. Changes to This Privacy Policy

If future updates to OpenCheckers introduce new features that affect how data is handled, we will update this Privacy Policy and revise the "Effective Date" above prior to or concurrent with the release.

---

## 8. Contact Us

If you have any questions about this Privacy Policy or OpenCheckers' privacy practices, please contact the developer via the support email listed on the Google Play Store listing page or via [https://buymeacoffee.com/nitruspeed](https://buymeacoffee.com/nitruspeed).

