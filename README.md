# Pause & Pray

*Pause and pray before you scroll.*

Pause & Pray puts a short Catholic prayer in front of Instagram, TikTok, WhatsApp, YouTube or any app the user picks. Prayers, prayer times and seasons follow the Church calendar, with a Nigerian national layer. It is built Android-first. The product spec is in [`docs/SPEC.md`](docs/SPEC.md).

This repository holds the MVP (version 1.0) codebase: one Expo (React Native, TypeScript) app plus a native module for each platform.

## Status

| Area | State |
|---|---|
| Shared app: screens, content, calendar, stats | Written, typechecked, and the Android JS bundle builds |
| Core logic: calendar, readings, Rosary, prayer times, gate rules, groups, guided prayers, campaigns, stats | 89 unit tests passing |
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
  app/            Expo Router screens; (tabs)/ holds the footer menu (Today, Readings, Prayers, Groups, Me)
  content/        prayers.json, calendar.json  ← all prayer and calendar text, translatable
  core/           pure TypeScript logic + __tests__
  state/          on-device store (expo-sqlite key-value)
  features/       local notifications
modules/app-gate/ native module
  android/        GateAccessibilityService, GateStore, AppGateModule (Kotlin)
  ios/            AppGateModule, GateShared (Swift)
targets/          iOS extensions: activity-monitor, shield-config, shield-action (+ _shared)
```

## How prayer times work

- The user sets **their own prayer times** (onboarding step "When will you pray?", and Me → Settings). When one comes, the chosen apps **stay paused until they tap "I've prayed"**: no time limit and no skip. "Put the phone down" closes the app without unlocking it.
- **Devotions are optional**: Morning Offering, the Angelus (6am, noon, 6pm; the Regina Caeli in Easter Time), the Hour of Mercy (3pm) and Night Prayer are off by default. Switched on, each works exactly like a personal prayer time, with its own prayer followed by the user's intentions.
- **Group prayer times** arrive the same way when the user belongs to a group that set one, converted to the member's own time zone.
- A time that is added or switched on partway through the day starts the next time it comes round, so it never locks the apps the moment it is set.
- Optional "Also pause between prayer times" (every-open mode) adds a short prayer on every app open, which *can* be skipped and opens the app for 15/30/60 minutes; a due prayer time still wins.
- Rules: `src/core/schedule.ts` (`duePrayer`) and `src/core/gate.ts`, mirrored in `GateStore.kt` (Android) and `GateShared.swift` (iOS), with tests in `src/core/__tests__/core.test.ts`.

## Prayer groups

Members of a parish, youth group, school or family pray together: create a group or join with a 6-letter invite code, share a group intention and an optional group prayer time, and see who has prayed today and the group's streak. Code: `src/app/(tabs)/groups.tsx`, `src/app/group/`, `src/features/groups.ts`, `src/core/groups.ts`.

- Groups need an account. Run `supabase/migrations/0002_prayer_groups.sql` (after `0001`) in the Supabase SQL editor. Row-level security lets members see only their own groups; creating and joining go through the `create_prayer_group` and `join_prayer_group` functions.
- **Privacy:** for each member the server stores only the *days* they prayed (one row per day per group), never their intentions or how often. The join screen tells members their group will see their name and the days they pray.
- Without Supabase keys, the browser preview and development builds use an on-device stand-in with a sample group (code `MONICA`) whose members are labelled as samples.

## Making money: Plus, parish plans and sponsored campaigns

What is free and what is paid is defined in one place: `src/core/plans.ts`. The prayer gate, intentions, readings, saint of the day and groups of up to 15 stay free.

### Pause & Pray Plus (individuals)

Guided Rosary with a bead counter (`src/app/rosary.tsx`), the Divine Mercy Chaplet (`src/app/chaplet.tsx`) and a nine-day novena for the user's intentions (`src/app/novena.tsx`, content in `src/content/novenas.json`). Paywall: `src/app/plus.tsx`. Billing: `src/features/billing.ts`, via [RevenueCat](https://www.revenuecat.com) (`react-native-purchases`), which handles Google Play and App Store subscriptions and receipts.

To switch it on:
1. Create the subscription products (for example monthly and yearly) in Google Play Console and App Store Connect, with regional prices.
2. In RevenueCat, add both apps, an entitlement called `plus` attached to those products, and a default offering with the packages.
3. Set `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` and `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (public SDK keys) in `.env`, then make a new development build.

Without keys, the browser preview and development builds use a stand-in that charges nothing; release builds hide Plus.

### Parish plans (organisations)

Groups of any size, a leader dashboard (`src/app/dashboard.tsx`: totals per group for today, 7 and 30 days; never who prayed what), announcements, a choice of group devotion (intentions, Angelus, Divine Mercy or a Rosary decade) and the organisation's name on its groups. Request form and plan page: `src/app/parish.tsx`. Server: `supabase/migrations/0003_parish_plans.sql`, which also enforces the 15-member limit for free groups.

Selling is by invoice, so app-store fees do not apply to it:
1. A leader sends a request in the app (Me → For parishes and schools). It lands in the `plan_requests` table.
2. You invoice them (for example through Paystack or Flutterwave).
3. Once paid, run `select public.activate_parish_plan('<request id>', '2027-12-31');` in the Supabase SQL editor. This creates the organisation, makes the requester its leader and sets the paid-until date. To renew, update `organizations.plan_active_until`.

Before relying on this, confirm with both stores' current rules that selling a group service to organisations outside in-app billing is acceptable for your setup.

### Sponsored seasonal campaigns

"40 days of Pause & Pray" (Ash Wednesday to Holy Saturday) and "Advent with Pause & Pray" appear on Today a week before they start, with progress during the season (`src/core/campaigns.ts`, `src/components/CampaignCard.tsx`, `src/content/campaigns.json`). A sponsor line ("Made possible by …") is set without an app update in the `campaign_sponsors` table (`supabase/migrations/0004_campaign_sponsors.sql`), for one year (`lent-2027`) or every year (`lent`).

Never charge for prayers or Mass intentions, and keep ads out: the data is religious and sensitive.

## For Catholics everywhere

The General Roman Calendar is the default. National calendars layer on top (Nigeria for now, chosen automatically for phones set to Nigeria, or in Me → Settings → Church calendar). To add a country, add its layer to `src/content/calendar.json` and a line to `src/core/country.ts`. Intention prayers no longer name a single country.

## Added after the MVP spec

| Feature | Code and data |
|---|---|
| Optional sign up / sign in (Supabase) | `src/features/auth.ts`, `src/app/welcome.tsx`, `sign-up.tsx`, `sign-in.tsx`, account card in `settings.tsx`, `supabase/migrations/` |
| Three prayer intentions, with prayers for each | `src/content/intentions.json` (two prayers per suggested intention, a template for the user's own), `pausePlan()` in `src/core/prayers.ts`, `src/components/IntentionsPicker.tsx`, `src/app/intentions.tsx`. A paused app prays for one intention in turn, then an Our Father, Hail Mary or Glory Be; **Pray now** prays for all three |
| Footer menu | `src/app/(tabs)/`: Today, Readings (with saint of the day), Prayers (with today's Rosary), Groups, Me (stats, settings, intentions, privacy) |
| Daily Mass readings | `src/content/lectionary.json` (references), `src/core/readings.ts`, `src/app/readings.tsx`; the Prayer Pause shows a verse from today's Gospel |
| Saint of the day, life and times | `lived`, `place`, `life` in `src/content/calendar.json`; `saintOfDay()` in `src/core/liturgical.ts`; `src/app/saint.tsx` |

### Accounts

Accounts are optional ("Continue without an account" is always offered). Only the account itself (name, email and Supabase-managed password) is on the server; prayers, intentions and history stay on the phone. To switch them on:

1. Create a Supabase project and copy its URL and anon key into `.env` (see `.env.example`).
2. Run `supabase/migrations/0001_delete_my_account.sql` in the Supabase SQL editor, so "Delete my account" works.
3. In Supabase Auth settings, keep email confirmation on and set the site URL for password-reset emails.

Without those keys, the web preview and development builds use a stand-in that keeps the name and email on the device and never stores a password. Release builds without keys hide accounts entirely.

### Mass readings

- **References** follow the Lectionary for Mass (Sunday cycle A/B/C, weekday cycle I/II). `lectionary.json` currently covers the rest of Year A (week 34), every day from Advent Sunday 2026 to the Baptism of the Lord 2027, the Year B Sundays and solemnities of Lent, Holy Week and Easter, and the fixed-date solemnities and major feasts. Other days show the verse of the day. Day keys and their tests are in `src/core/readings.ts` and `src/core/__tests__/readings.test.ts`.
- **Text** is adapted from the World English Bible (public domain). The divine name is rendered "the LORD" (and "the Lord GOD"), as the Church asks for prayer and as the WEB Catholic Edition does; the deuterocanonical books come from that Catholic Edition. Because the wording changes, the app credits it as "adapted from the World English Bible".
- **Numbering:** the Lectionary counts psalm titles as verses, and a few books (Isaiah 63–64, Malachi 3–4, the end of Romans) are numbered differently in the WEB. Psalm offsets are in `scripts/build-readings.mjs`; other differences are given per reading as `webRef`.
- **To add days:** add entries to `lectionary.json`, then run `node scripts/build-readings.mjs`. The build stops on any reference it cannot find, or any psalm whose offset is not listed.
- `data/web-bible.json` is built by `scripts/bible/build-bible.mjs` from the `world-english-bible` and `evangelization` npm packages (see the script header).

**Before release:** the adviser checks every reference against the Lectionary that Nigerian parishes use. Partial verses (the "a" and "b" in "16b") are shown as whole verses. The rest of the year's references still need to be entered.

## Browser preview

`node scripts/build-web-preview.mjs` builds the real app for the web into `preview/dist/`, inside a phone frame (`preview/index.html`). A browser cannot pause other apps, so the preview uses sample apps instead (`src/features/demo.ts`). It also has no reminders, and it keeps its data in the browser's local storage.

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

```bash
npm run lint
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

0. **Prayer times lock until prayed, and the Angelus and Hour of Mercy are optional** (asked for after the spec; see "How prayer times work"). "Skip for now" exists only in the optional every-open mode, outside prayer times. Accounts and prayer groups are also new, and the app is no longer Nigeria-only.

1. **Android: no AlarmManager and no foreground service.** The service checks the schedule each time an app opens, so it needs no exact alarms. Android keeps an enabled accessibility service running by itself. This removes two Play Console declarations (exact alarms and foreground service type), so those items in the spec's Play checklist no longer apply. If testing shows the service being killed on some phones (Tecno, Infinix and Itel are worth checking), a foreground service can be added back.
2. **iOS: the shield cannot open the app.** Apple does not let a Shield Action extension open its parent app. So "Pray now" posts a notification, and tapping it opens the Prayer Pause screen. "Skip for now" on the shield unlocks at once and is recorded for the stats.
3. **iOS: an unlock opens all chosen apps.** Apple's app tokens are opaque, so "I've prayed" lifts the shield for every gated app at once. Apple's shortest monitored interval is 15 minutes; the app uses it only to switch the shield on at each prayer time, and the shield then stays on until the user prays.
4. **"Minutes reclaimed" is not measured yet.** The app cannot honestly know how long someone would have scrolled. Instead it shows **minutes in prayer** (measured) and **times you put the phone down**. That second figure comes from a new third button on the Prayer Pause screen, "Put the phone down". How to define "minutes reclaimed" is now an open decision.
5. **"I've prayed" turns on after 5 seconds**, so the tap comes after the prayer. You can change this with `PRAY_DELAY_MS` in `pause.tsx`.
6. **Storage is SQLite** (`expo-sqlite/kv-store`), one of the spec's two options. MMKV is not part of this Expo SDK's tested set.
7. **The liturgical calendar is our own code**, not romcal. It is small, has no dependencies, and is tested against known dates: Ash Wednesday on 10 February 2027, Easter on 28 March 2027, today (22 November 2026) as Christ the King, and the transfers of St. Joseph, the Annunciation and the Immaculate Conception. Its simplifications are listed at the top of `src/core/liturgical.ts`. It could be swapped for romcal behind the same function later.
8. **The Rosary follows the *Rosarium Virginis Mariae* weekday pattern**, the one that includes the Luminous mysteries. **The Regina Caeli replaces the Angelus** from Easter Sunday to Pentecost.
9. `expo-notifications` adds an `aps-environment` (push) entitlement on iOS, although the app only uses local notifications.

## Before release: content and calendar checks

- [ ] Theological adviser reviews every text in `src/content/prayers.json`, the intention prayers in `src/content/intentions.json` and every entry in `src/content/calendar.json`, then sets `reviewStatus` to `approved`.
- [ ] **Rights check:** the Hour of Mercy text and the Divine Mercy Chaplet prayers follow the English translation of St. Faustina's *Diary* (nos. 187 and 476). Confirm permission, or replace it with our own translation (see `rightsCheck` in `prayers.json`).
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
