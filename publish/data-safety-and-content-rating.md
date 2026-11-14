# Google Play Console — App Content & Compliance Answers

Use this reference to complete all required declarations under **Monitor and improve → Policy and programs → App content** in Google Play Console.

---

## 1. Data Safety Questionnaire

In Google Play Console, "Data collection" means transmitting data off the user's device to a developer server or third-party SDK. Because OpenCheckers stores all game data, ratings, analyses, and custom files strictly on the user's device (`AsyncStorage` and local app storage) and has the native AdMob SDK excluded via `react-native.config.js`:

| Question | Answer | Notes |
| :--- | :--- | :--- |
| **Does your app collect or share any of the required user data types?** | **No** | All game saves, Elo ratings, and user-imported theme images/sounds stay strictly on the user's device and are never transmitted off the device. |
| **Is all of the user data collected by your app encrypted in transit?** | *(Not applicable when "No" is selected above)* | — |
| **Do you provide a way for users to request that their data is deleted?** | *(Not applicable when "No" is selected above)* | Users can delete all local data anytime via Settings → Reset or Android App Settings → Clear Storage. |

---

## 2. Ads Declaration

| Question | Answer | Notes |
| :--- | :--- | :--- |
| **Does your app contain ads?** | **No, my app does not contain ads** | Rewarded ads are disabled on all platforms (`react-native-google-mobile-ads` native linking is excluded in `react-native.config.js` and `app.json`). |

---

## 3. App Access (Login / Credentials)

| Question | Answer | Notes |
| :--- | :--- | :--- |
| **All functionality in my app is available without any access restrictions** | **Yes — All functionality is available without special access** | No login, account creation, paywall, or geo-restriction exists. |

---

## 4. Content Rating (IARC Questionnaire)

1. Choose category: **Game**
2. Answer **"No"** to all content descriptors:
   - **Violence, Blood, or Gore:** No (abstract board game pieces only)
   - **Fear / Horror:** No
   - **Sexuality / Nudity:** No
   - **Simulated Gambling / Real-Money Gambling:** No
   - **Language / Profanity:** No
   - **Controlled Substances (Drugs, Alcohol, Tobacco):** No
   - **Crude Humor:** No
3. Answer **"No"** to all interactive elements:
   - **Users Interact (Chat, Sharing Personal Info, Multiplayer):** No (two-player mode is local pass-and-play on the same device; PDN sharing uses the standard system text share sheet)
   - **Shares User's Physical Location:** No
   - **Unrestricted Internet Access:** No
   - **Purchases Digital Goods (In-App Purchases / Loot Boxes):** No

**Expected IARC Ratings:**
- **ESRB:** Everyone (`E`)
- **PEGI:** `PEGI 3`
- **USK:** `USK 0`
- **IARC Generic:** `3+`

---

## 5. Target Audience and Content

> [!TIP]
> Selecting **13–15, 16–17, and 18 and over** avoids triggering Google Play's Designed for Families / Children's policy restrictions while still allowing an "Everyone / PEGI 3" content rating.

| Question | Recommended Selection |
| :--- | :--- |
| **Target age groups** | ✅ `13–15`, ✅ `16–17`, ✅ `18 and over` |
| **Could your store listing unintentionally appeal to children?** | **No** |

---

## 6. Other App Content Declarations

| Section | Answer |
| :--- | :--- |
| **News apps** | No, my app is not a news app |
| **COVID-19 contact tracing and status apps** | My app is not a publicly available COVID-19 contact tracing or status app |
| **Government apps** | No, this app is not affiliated with a government entity |
| **Financial features** | My app doesn't provide any financial features |
| **Health apps** | My app does not have any health features |
| **Foreground service permissions** | Not used (`android.permission.FOREGROUND_SERVICE` is explicitly blocked in `app.json`) |
| **Exact alarm permission** | Not used |

