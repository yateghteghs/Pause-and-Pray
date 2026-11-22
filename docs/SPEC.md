# Pause & Pray: Product Spec

Nov 22, 2026 · Solomon Kershima Yateghtegh

## Overview

Pause & Pray pauses distracting apps (Instagram, TikTok, WhatsApp, YouTube) and asks the user to say a short Catholic prayer before they continue. It works like PrayMode's "pray before you scroll" gate, but every prayer, schedule and reminder follows Catholic tradition and the Church calendar.

**Problem.** Many Catholics want to pray more often but lose those moments to their phones. General Christian apps blend traditions, and the Catholic app blockers that already exist appear to be iPhone-first and built for American and Latin American users, not African Catholics on Android.

### Target users

- Young Catholic adults and university students (18 to 35) who spend hours on social media
- Parish youth groups, Catholic schools, chaplaincies and lay associations (CYON, CWO, Legion of Mary)
- Catholic parents who want a prayerful phone habit for the household
- Launch markets: Nigeria first, then the wider African and global Catholic community

**Positioning.** Pause & Pray is not the first Catholic app blocker, so it competes on fit for African Catholics: Android first (most Nigerians use Android), local languages, a parish and group mode, and endorsement from the diocese. Tagline: "Pause and pray before you scroll."

| App | What it does | Gap Pause & Pray fills |
|---|---|---|
| Rosary Lock | Locks chosen apps at prayer times set by the Catholic liturgical calendar; unlock by praying the Rosary, a decade or the Angelus | iPhone listing found, Android unconfirmed; no African languages or parish mode |
| Catholic Hours | Blocks chosen apps and sets aside time for the Divine Office | iPhone only; needs a subscription |
| Ora Primero | Blocks apps until a short guided prayer; Catholic, Evangelical or general tradition | Not Catholic-only; Spanish and English focus |
| PrayMode | Pauses apps for a short, general Christian prayer | No Catholic prayers or Church calendar |
| Hallow | Catholic audio prayer, meditation and content | Does not block distracting apps |

## Core features

The first version (MVP) ships seven features. Everything else waits until real users show what they want.

### MVP (version 1.0)

1. **App picker.** The user chooses which apps to gate. On iOS this uses Apple's system picker; on Android it lists the installed apps.
2. **Prayer Pause screen.** Opening a gated app shows a full-screen card with a Catholic prayer and the line "Pause and pray before you scroll."
3. **Unlock flow.** "I've prayed" unlocks the app for a set window (15, 30 or 60 minutes). "Skip for now" unlocks it right away and is counted honestly in the stats.
4. **Catholic prayer schedule.** Optional gates at the Angelus (6am, 12 noon, 6pm), the Divine Mercy hour (3pm), morning offering and night prayer.
5. **Daily Rosary mystery.** The mystery of the day (Joyful, Sorrowful, Glorious, Luminous) follows the traditional weekday pattern.
6. **Liturgical calendar.** Season colour, feast or solemnity of the day, and saint of the day.
7. **Streaks and stats.** Days prayed, prayers said, minutes reclaimed from social media.

### Later versions

- Full Rosary and Divine Mercy Chaplet with a bead counter
- Daily Mass readings (needs a licence, see Catholic content)
- Liturgy of the Hours (Lauds, Vespers, Compline)
- Lent and Advent challenges, novenas (such as the 9-day novena before a feast)
- Parish and group mode: a youth group or school prays together and sees a shared streak
- Local languages: Tiv, Igbo, Yoruba, Hausa, French and Swahili prayer texts
- Audio prayers, home-screen widgets and Apple Watch support
- Optional premium tier (themes, extra content, family plans)

## Catholic content

The MVP can launch using only traditional prayers that anyone may use. Mass readings and the Liturgy of the Hours come later, once licences are in place.

| Content | Source | Can we use it freely? |
|---|---|---|
| Our Father, Hail Mary, Glory Be, Apostles' Creed | Traditional prayers | Yes, but write or check our own English wording |
| Angelus, Regina Caeli, Memorare, Act of Contrition, St. Michael prayer | Traditional prayers | Yes, same check |
| Rosary mysteries and Divine Mercy Chaplet structure | Church tradition; St. Faustina's devotion | Yes for the structure; check any published commentary |
| Scripture verses | Douay-Rheims Bible (Challoner edition) | Yes, public domain |
| Mass readings in modern English | Lectionary translations owned by bishops' conferences | No, licence needed |
| Liturgy of the Hours, Roman Missal texts | English translation owned by ICEL | No, licence needed |
| Liturgical calendar and feast dates | General Roman Calendar | Yes; an open-source library such as romcal can calculate it |
| Saint biographies | Written by us | Yes, if we write them ourselves |

### Content rules

- Every prayer text is reviewed by a priest or theologian before release.
- Use the national calendar of Nigeria (for example, local feasts and holy days of obligation) as well as the universal calendar.
- Ask the Catholic Bishops' Conference of Nigeria which Bible and Lectionary edition Nigerian parishes use, and request a licence for it.
- Keep all prayer text in a content file (JSON) so it can be translated and updated without a new app release.

## Technical architecture

Build one shared app in React Native (Expo), plus a small native module on each platform for the blocking. The blocking has to be native because Android and iOS do it in completely different ways. The shared app holds the prayers and settings; each platform's native code does the blocking in its own way.

### Shared app (React Native + Expo, TypeScript)

- Screens: onboarding, app picker, schedule settings, prayer library, Prayer Pause, stats
- Prayer content and the liturgical calendar, stored as bundled JSON
- Local storage for settings, the list of gated apps, streaks and stats (SQLite or MMKV)
- Local notifications for the Angelus, the 3pm Divine Mercy hour and other reminders
- Flutter is an equally good choice if the developer you hire knows it better

### Android native module (Kotlin)

- An AccessibilityService listens for `TYPE_WINDOW_STATE_CHANGED` events to see which app just opened
- If that app is gated and a prayer window is active, it launches the Prayer Pause screen over the app (overlay, `SYSTEM_ALERT_WINDOW`)
- AlarmManager exact alarms switch prayer windows on and off at the right minute
- A small foreground service keeps the gate running reliably in the background

### iOS native extensions (Swift)

- FamilyControls: asks the user for Screen Time permission and shows Apple's app picker
- ManagedSettings: places a shield over the chosen apps
- DeviceActivity monitor extension: turns the shield on and off at the scheduled prayer times
- Shield Configuration extension: draws the Catholic "Pause and pray" shield screen
- Shield Action extension: handles the "I've prayed" button, then opens the main app to show the prayer
- An App Group shares settings between the main app and the extensions

### Backend (optional for the MVP)

- None needed for version 1.0; everything runs on the phone
- Later: Firebase or Supabase for accounts, parish groups, shared streaks and content updates
- Analytics with no personal data (for example, a privacy-friendly tool or Firebase with ads tracking off)

One iOS limit to plan for: the shield screen can only show a short title, a few lines of text and buttons. The full prayer therefore opens inside the main app after the user taps the button.

## Store compliance

The two biggest launch risks are approvals, not code. Google must approve the Accessibility Service use, and Apple must grant the Family Controls entitlement. Start both early.

### Google Play

- [ ] Open a Play Console developer account ($25 one-time). An organisation account (Index Prima or SKYHub, with a D-U-N-S number) avoids the closed-testing rules for new personal accounts.
- [ ] Fill in the Accessibility Services Permission Declaration Form in Play Console. Apps that use this API must complete it and get Google's approval (Google Play policy).
- [ ] Show a clear in-app explanation screen before asking for the permission, saying exactly what the service reads (only the name of the app that opened) and why.
- [ ] Record a short demo video of that explanation and the gate working, for the review.
- [ ] Do not set `isAccessibilityTool=true`; the app is a digital-wellbeing tool, not an accessibility tool.
- [ ] Declare the foreground service type and the exact-alarm use in Play Console.
- [ ] Complete the Data safety form and link the privacy policy.

### Apple App Store

- [ ] Enrol in the Apple Developer Program ($99 a year), ideally as an organisation.
- [ ] Request the Family Controls (Distribution) entitlement through Apple's request form. It is needed for TestFlight and App Store builds, not just development.
- [ ] Request it for the main app and for every extension (monitor, shield configuration, shield action). Developers on Apple's forums report being blocked when an extension was left out.
- [ ] Expect a wait of two weeks or more; developers report requests sitting in "Submitted" for that long.
- [ ] Fill in the App Privacy "nutrition label" and add the privacy policy link.
- [ ] Use App Store category Lifestyle or Productivity, with Reference as a secondary option.

## Church approval, privacy and legal

Two things need early attention: permission from the Church to present the app as Catholic, and careful handling of religious data, which is sensitive data in law.

### Church approval

- Canon 216 says no initiative may call itself "Catholic" without the consent of the competent Church authority. Write to the Bishop of Makurdi (through the diocesan communications or liturgy office) to ask for a review or endorsement.
- Ask a priest to act as theological adviser and to sign off on all prayer text.
- An imprimatur is not normally needed for an app, but a letter of approval from the diocese helps with parishes and press.
- Do not use Vatican or Holy See emblems, or diocesan logos without written permission.

### Privacy

- Using a Catholic prayer app reveals a person's religion. Under the Nigeria Data Protection Act 2023, religious belief counts as sensitive personal data, and the GDPR treats it the same way.
- Keep everything on the phone in version 1.0: no account, no server copy of prayer history.
- If accounts arrive later, get explicit consent, collect as little as possible, and let users export and delete their data.
- The Android service reads only the name of the app that opened, never screen content. Say this plainly in the app and the privacy policy.
- On iOS, Apple's Screen Time tools hide which apps the user picked, even from the developer.

### Legal setup

- Publish under a registered company (Index Prima or SKYHub), not a personal name
- Privacy policy and terms of use hosted on the app's website
- Check the app name for trademark conflicts before you file
- Children: if the app may be used by under-18s (for example, in Catholic schools), add parental consent and follow both stores' rules for children's apps

## Roadmap, team and budget

The target is to launch on Android for Ash Wednesday (10 February 2027) and on iOS by Easter (28 March 2027). The iOS date depends on when Apple approves the Family Controls entitlement. Each launch waits on its store's approval, so both requests go in during Foundations.

### Team

| Role | Who | Main work |
|---|---|---|
| Product owner | Solomon | Spec, Church relations, privacy, launch and community |
| Mobile developer | To hire (React Native with native Kotlin and Swift experience) | Shared app, Android service, iOS extensions |
| UI/UX designer | To hire, part-time | Prayer Pause screen, onboarding, app icon, store screenshots |
| Theological adviser | A priest or Catholic theologian | Reviews every prayer and calendar entry |
| Beta community | A parish youth group, chaplaincy or Catholic student society | Testing and feedback |

### Budget items

| Item | Cost |
|---|---|
| Apple Developer Program | $99 a year |
| Google Play Console | $25 one-time |
| Mobile developer (MVP, both platforms) | Get 2 to 3 quotes; usually the largest cost |
| Designer | Get quotes; part-time for about 4 weeks |
| Domain, website hosting, privacy policy | Small yearly cost |
| Content licences (Mass readings, later) | Ask the rights holder; not needed for MVP |
| Test phones (one Android, one iPhone) | Needed if the developer does not have both |

### Launch plan

- Launch story for Index Prima and your video channel: Pause & Pray, an African-built Catholic app that helps young people pray before they scroll
- Ask the diocese to share it through parishes and the diocesan newsletter or radio
- Partner with CYON, Catholic chaplaincies at universities and Catholic schools
- Lent challenge: "40 days of Pause & Pray" with shareable streak cards in Index Prima's green and white or the app's own colours

## Success metrics and open decisions

The question that matters most is whether people keep praying through the gate after the first week, so day-7 and day-30 retention are the main measures.

### Metrics to track (all counted on the phone, no personal data)

- Installs and completed onboarding (permission granted, at least one app gated)
- Day-7 and day-30 retention
- Share of Prayer Pause screens ending in "I've prayed" rather than "Skip for now"
- Average streak length and prayers per user per day
- Store rating and number of parishes or groups using the app

Targets are still to be set once beta numbers come in.

### Open decisions

- [ ] App name chosen: Pause & Pray. Still to check: store listings, domain and trademark.
- [ ] Brand it under Index Prima, SKYHub, or as a stand-alone product?
- [ ] Free with donations, freemium, or fully free with diocesan or sponsor support?
- [ ] React Native or Flutter (go with the hired developer's strength)
- [ ] Which Bible and Lectionary edition to license for Nigeria
- [ ] Launch languages beyond English
- [ ] Build in-house or hire an agency
