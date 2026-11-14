# OpenCheckers — App Store Publishing Package (`publish/`)

This folder contains all binaries, symbol files, store graphics, screenshots, listing copy, and compliance documents needed to publish **OpenCheckers v1.0.0** (`com.neel.checkers`, Android Version Code `17`).

---

## 1. Directory Contents

```text
publish/
├── README.md                              # This step-by-step publishing checklist
├── store-listing.md                       # App name, short/full descriptions, tags & release notes
├── privacy-policy.md                      # Full privacy policy in Markdown
├── privacy-policy.html                    # Ready-to-host standalone HTML privacy policy
├── data-safety-and-content-rating.md      # Exact answers for Play Console Data Safety & IARC forms
├── binaries/
│   ├── OpenCheckers-1.0.0.aab             # Signed Production Android App Bundle (for Google Play)
│   ├── OpenCheckers-1.0.0.aab.sha256      # SHA-256 checksum for the AAB
│   ├── OpenCheckers-1.0.0.apk             # Signed Universal Release APK (for direct/alternative stores)
│   ├── OpenCheckers-1.0.0.apk.sha256      # SHA-256 checksum for the APK
│   ├── mapping.txt                        # R8/ProGuard deobfuscation mapping file
│   └── native-debug-symbols.zip           # Native (.so) debug symbols for Play Console crash reports
├── graphics/
│   ├── icon-512x512.png                   # 512×512 Google Play Store hi-res icon
│   ├── icon-1024x1024.png                 # 1024×1024 master store icon
│   └── feature-graphic-1024x500.png       # 1024×500 Google Play Store feature graphic
├── video/
│   ├── opencheckers-playstore-landscape-1920x1080.mp4      # 16:9 Full HD promo video (for YouTube / Play Store listing)
│   ├── opencheckers-playstore-portrait-promo-1080x1920.mp4 # 9:16 Full HD branded portrait promo video (with header & phone frame)
│   └── opencheckers-playstore-portrait-1080x1920.mp4       # 9:16 Full HD raw full-bleed mobile screen recording
└── screenshots/
    ├── phone/                             # 6 native 1080×2400 phone screenshots
    │   ├── 01-play-board-and-opponents.png
    │   ├── 02-full-game-computer-analysis.png
    │   ├── 03-saved-analysis-library.png
    │   ├── 04-evaluation-graph-and-variations.png
    │   ├── 05-club-room-and-gameplay.png
    │   └── 06-personalization-and-sound-settings.png
    ├── tablet-7in/                        # 4 high-res 1600×1000 7-inch tablet screenshots
    │   ├── 01-tablet-club-play.png
    │   ├── 02-tablet-computer-analysis.png
    │   ├── 03-tablet-variation-explorer.png
    │   └── 04-tablet-club-personalization.png
    └── tablet-10in/                       # 4 high-res 1600×1000 10-inch tablet screenshots
        ├── 01-tablet-club-play.png
        ├── 02-tablet-computer-analysis.png
        ├── 03-tablet-variation-explorer.png
        └── 04-tablet-club-personalization.png
```

---

## 2. Binary & Signing Details

| Property | Value |
| :--- | :--- |
| **Application Name** | `OpenCheckers` |
| **Application ID / Package** | `com.neel.checkers` |
| **Version Name** | `1.0.0` |
| **Version Code** | `17` |
| **Min SDK / Target SDK / Compile SDK** | `24` (Android 7.0) / `36` (Android 16) / `37` |
| **Included ABIs** | `arm64-v8a`, `armeabi-v7a`, `x86_64` |
| **Signing Keystore** | `.keys/draughts-club.p12` (`CN=Draughts Club`, RSA 3072-bit) |
| **Signing Certificate SHA-256** | `84d27d1fe22a847b6978c5838c51ee4894421e8ed6247b32c241a353b1d2d010` |
| **AAB Size & SHA-256** | `45,550,721` bytes (`43.4 MB`) · `dca8aa4e76791fef7aca284e1e2baf8bab4ed93259cafeb0e34b3119e9aafd93` |
| **APK Size & SHA-256** | `76,665,088` bytes (`73.1 MB`) · `3ce3ecd932a3f702dd699dd213c92dbc8ce975b87a614280bcf46ec6b0a9d7d9` |

> [!CAUTION]
> **Back Up Your Signing Key:** Keep a secure, offline backup of the `.keys/` directory (`draughts-club.p12` and `android-signing.json`). Google Play uses this key as your upload key, and direct APK installations require the exact same signing key to install future updates without uninstalling. Never commit `.keys/` to a public repository.

---

## 3. Step-by-Step Google Play Console Upload Guide

### Step 1: Create the App
1. Open [Google Play Console](https://play.google.com/console) and click **Create app**.
2. Set **App name** to `OpenCheckers` (or `OpenCheckers: Draughts & AI`).
3. Select **Default language**: `English (United States) – en-US`.
4. Select **App or game**: `Game`.
5. Select **Free or paid**: `Free`.
6. Check the Developer Program Policies and US export laws boxes and click **Create app**.

### Step 2: Host & Link the Privacy Policy
1. Host [`privacy-policy.html`](./privacy-policy.html) on a public HTTPS URL (e.g., GitHub Pages, Netlify, Vercel, or your website).
2. In Play Console, go to **Policy and programs → App content → Privacy policy** and paste the public HTTPS link.

### Step 3: Complete App Content Declarations
Open [`data-safety-and-content-rating.md`](./data-safety-and-content-rating.md) and copy the answers into **Policy and programs → App content**:
- **Ads:** No, my app does not contain ads.
- **App access:** All functionality is available without special access.
- **Content ratings:** Complete the IARC questionnaire (Game → "No" to all violence/gambling/online interaction questions → yields **Everyone / PEGI 3**).
- **Target audience:** Select **13–15, 16–17, and 18 and over**.
- **Data safety:** Select **No** for data collection/sharing (all data stays on-device).

### Step 4: Set Up Main Store Listing
Open [`store-listing.md`](./store-listing.md) and go to **Grow users → Store presence → Main store listing**:
1. Paste the **Short description** (<= 80 chars) and **Full description** (<= 4,000 chars).
2. Upload **App icon**: [`graphics/icon-512x512.png`](./graphics/icon-512x512.png).
3. Upload **Feature graphic**: [`graphics/feature-graphic-1024x500.png`](./graphics/feature-graphic-1024x500.png).
4. Upload **Phone screenshots**: select all 6 files in [`screenshots/phone/`](./screenshots/phone/).
5. Upload **7-inch tablet screenshots**: select all 4 files in [`screenshots/tablet-7in/`](./screenshots/tablet-7in/).
6. Upload **10-inch tablet screenshots**: select all 4 files in [`screenshots/tablet-10in/`](./screenshots/tablet-10in/).
7. Under **Store settings**, select Category **Games → Board**, add tags (`Board`, `Checkers`, `Strategy`, `Offline`), and enter your support email.

### Step 5: Upload the Production Release (`.aab`)
1. Go to **Test and release → Production** (or **Closed testing** if completing the 14-day tester requirement on a personal developer account).
2. Click **Create new release**.
3. Under **App bundles**, upload [`binaries/OpenCheckers-1.0.0.aab`](./binaries/OpenCheckers-1.0.0.aab).
4. Once uploaded, click the three-dot menu next to the bundle (if Play Console prompts for symbols/mapping) and upload:
   - **ReTrace mapping file:** [`binaries/mapping.txt`](./binaries/mapping.txt)
   - **Native debug symbols:** [`binaries/native-debug-symbols.zip`](./binaries/native-debug-symbols.zip)
5. Paste the **Release notes** from [`store-listing.md`](./store-listing.md) into the **Release notes** box.
6. Click **Next → Save → Send for review**.

