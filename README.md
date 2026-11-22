# Pause & Pray

*Pause and pray before you scroll.*

Pause & Pray puts a short Catholic prayer in front of Instagram, TikTok, WhatsApp, YouTube or any app the user picks. Prayers, prayer times and seasons follow the Church calendar, with a Nigerian national layer. It is built Android-first. The product spec is in [`docs/SPEC.md`](docs/SPEC.md).

This repository holds the MVP (version 1.0) codebase: one Expo (React Native, TypeScript) app plus a native module for each platform.

## Status

| Area | State |
|---|---|
| Shared app: screens, content, calendar, stats | Written, typechecked, and the Android JS bundle builds |
| Core logic: calendar, Rosary, schedule, gate rules, stats | 38 unit tests passing |
| Android gate (Kotlin AccessibilityService) | Written; **not yet compiled or run on a device** |
| iOS gate (Swift: FamilyControls, ManagedSettings, 3 extensions) | Written; **not yet compiled**, and it needs Apple's Family Controls entitlement |
| Prayer and calendar text | Every entry is `reviewStatus: pending` until the theological adviser signs it off |

`expo prebuild` runs cleanly. It generates the Android project and the iOS project with the three extension targets and their entitlements. The native code still needs its first build on a machine with Android Studio and Xcode.

## MVP features and where they live

| # | Feature | Code |
|---|---|---|
| 1 | App picker | `src/app/apps.tsx` (Android installed-app list; Apple's `FamilyActivityPicker` on iOS) |
| 2 | Prayer Pause screen | `src/app/pause.tsx` |
| 3 | Unlock flow (15 / 30 / 60 min; skips counted) | `src/app/pause.tsx`, `src/core/gate.ts`, native `unlock()` |
| 4 | Catholic prayer schedule (Angelus 6/12/18, 3pm Hour of Mercy, morning, night) | `src/core/schedule.ts`, `src/app/settings.tsx`, `src/features/reminders.ts` |
| 5 | Daily Rosary mystery | `src/core/rosary.ts` |
| 6 | Liturgical calendar: season, colour, feast, saint | `src/core/liturgical.ts`, `src/content/calendar.json` |
| 7 | Streaks and stats | `src/core/stats.ts`, `src/app/stats.tsx` |

```
src/
  app/            Expo Router screens (index = Today, onboarding, pause, apps, settings, prayers, stats, privacy)
  content/        prayers.json, calendar.json  ← all prayer and calendar text, translatable
  core/           pure TypeScript logic + __tests__
  state/          on-device store (expo-sqlite key-value)
  features/       local notifications
modules/app-gate/ native module
  android/        GateAccessibilityService, GateStore, AppGateModule (Kotlin)
  ios/            AppGateModule, GateShared (Swift)
targets/          iOS extensions: activity-monitor, shield-config, shield-action (+ _shared)
```

## Running it

You need Node 20 or later. Native builds need Android Studio for Android and Xcode 16 or later for iOS.

```bash
npm install
```

```bash
npm test
```

```bash
npm run typecheck
```

The gate uses native code, so Expo Go is not enough. Build a development build instead:

```bash
npm run android
```

```bash
npm run ios
```

Or build in the cloud with EAS (`npx eas-cli@latest build --profile development`). In Expo Go or on the web, the app runs without the gate. The Today screen, the prayers and "Pray now" all work.

Before the first iOS build, add `ios.appleTeamId` to `app.json`. The extension targets need it.

### How the gate works

**Android.** `GateAccessibilityService` listens only for `TYPE_WINDOW_STATE_CHANGED` and reads only `event.packageName`; `canRetrieveWindowContent` is `false`. If the package is gated and not unlocked, and the mode is "every open" or a prayer window is active, it opens `pauseandpray://pause?app=<package>`. That deep link shows the Prayer Pause screen. After "I've prayed", the app calls `unlock()` and reopens the target app.

**iOS.** The main app saves the `FamilyActivitySelection` and settings in the App Group `group.org.pauseandpray.app`. In "every open" mode the shield stays on. In "prayer times" mode, one repeating `DeviceActivitySchedule` per prayer time turns it on and off. "I've prayed" lifts the shield and starts a one-off schedule, and the monitor extension puts the shield back when it ends.

## Changes from the spec (please review)

1. **Android: no AlarmManager and no foreground service.** The service checks the schedule each time an app opens, so it needs no exact alarms. Android keeps an enabled accessibility service running by itself. This removes two Play Console declarations (exact alarms and foreground service type), so those items in the spec's Play checklist no longer apply. If testing shows the service being killed on some phones (Tecno, Infinix and Itel are worth checking), a foreground service can be added back.
2. **iOS: the shield cannot open the app.** Apple does not let a Shield Action extension open its parent app. So "Pray now" posts a notification, and tapping it opens the Prayer Pause screen. "Skip for now" on the shield unlocks at once and is recorded for the stats.
3. **iOS: an unlock opens all chosen apps.** Apple's app tokens are opaque, so the unlock lifts the shield for every gated app at once. Unlock windows and prayer windows are at least 15 minutes long, which is Apple's shortest schedule.
4. **"Minutes reclaimed" is not measured yet.** The app cannot honestly know how long someone would have scrolled. Instead it shows **minutes in prayer** (measured) and **times you put the phone down**. That second figure comes from a new third button on the Prayer Pause screen, "Put the phone down". How to define "minutes reclaimed" is now an open decision.
5. **"I've prayed" turns on after 5 seconds**, so the tap comes after the prayer. You can change this with `PRAY_DELAY_MS` in `pause.tsx`.
6. **Storage is SQLite** (`expo-sqlite/kv-store`), one of the spec's two options. MMKV is not part of this Expo SDK's tested set.
7. **The liturgical calendar is our own code**, not romcal. It is small, has no dependencies, and is tested against known dates: Ash Wednesday on 10 February 2027, Easter on 28 March 2027, today (22 November 2026) as Christ the King, and the transfers of St. Joseph, the Annunciation and the Immaculate Conception. Its simplifications are listed at the top of `src/core/liturgical.ts`. It could be swapped for romcal behind the same function later.
8. **The Rosary follows the *Rosarium Virginis Mariae* weekday pattern**, the one that includes the Luminous mysteries. **The Regina Caeli replaces the Angelus** from Easter Sunday to Pentecost.
9. `expo-notifications` adds an `aps-environment` (push) entitlement on iOS, although the app only uses local notifications.

## Before release: content and calendar checks

- [ ] Theological adviser reviews every text in `src/content/prayers.json` and every entry in `src/content/calendar.json`, then sets `reviewStatus` to `approved`.
- [ ] **Rights check:** the Hour of Mercy text follows the English translation of St. Faustina's *Diary* (no. 187). Confirm permission, or replace it with our own translation (see `rightsCheck` in `prayers.json`).
- [ ] Check the Douay-Rheims verse texts against a printed Challoner edition.
- [ ] **CBCN:** confirm whether Nigeria moves Epiphany, Ascension and Corpus Christi to Sunday (`national.NG.transfers` in `calendar.json`, currently set to the universal calendar), which days are holy days of obligation, and any other national feasts and memorials. Bl. Cyprian Michael Iwene Tansi (20 January) is in the list, marked `verify`.
- [ ] Saint descriptions are written by us. The adviser should check them for accuracy.

## Store and approval checklist (code side)

- The Play prominent-disclosure screen is in `src/app/onboarding.tsx` (`AndroidPermission`). The service description is in `modules/app-gate/android/src/main/res/values/strings.xml`. Keep both in step with the Play declaration form.
- The app lists installed apps through a `<queries>` launcher intent, not `QUERY_ALL_PACKAGES`, so no extra Play declaration is needed for the picker.
- `isAccessibilityTool` is explicitly `false`.
- iOS needs the Family Controls (Distribution) entitlement for **four** bundle IDs: `org.pauseandpray.app` plus `.device-activity-monitor`, `.shield-config` and `.shield-action`.
- The bundle ID and package name `org.pauseandpray.app` are placeholders. Change them in `app.json` once the publishing company (Index Prima or SKYHub) is decided. If you do, also update the App Group in `app.json` and in both copies of `GateShared.swift`.

## Privacy

Everything stays on the phone: no account, no network calls, no analytics. Settings → Privacy explains what the gate can see and has **Delete all my data**. Prayer history is religious data, which is sensitive personal data under the NDPA 2023 and the GDPR, so any future sync needs explicit consent first.
