// GateShared.swift
//
// Shared by the AppGate native module and the three Screen Time extensions.
// The copy in targets/_shared/GateShared.swift must stay identical
// (checked by src/core/__tests__/native-shared.test.ts).
//
// Rules mirror src/core/gate.ts and src/core/schedule.ts.

import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

enum GateShared {
  /// Must match ios.entitlements in app.json and each target's config.
  static let appGroup = "group.org.pauseandpray.app"
  static let minWindowMinutes = 15

  private static let selectionKey = "selection"
  private static let configKey = "config"
  private static let unlockedUntilKey = "unlockedUntil"
  private static let lastPrayedAtKey = "lastPrayedAt"
  private static let eventsKey = "extensionEvents"

  static let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("pauseAndPray"))
  static let unlockActivity = DeviceActivityName("pauseAndPray.unlock")
  static let windowPrefix = "pauseAndPray.window."

  static var defaults: UserDefaults { UserDefaults(suiteName: appGroup) ?? .standard }

  struct ScheduleItem: Codable {
    let id: String
    let hour: Int
    let minute: Int
    let enabled: Bool
    /** Epoch ms; occurrences before it do not count. */
    let since: Double
  }

  struct Config: Codable {
    let gatedApps: [String]
    let mode: String
    let unlockMinutes: Int
    let schedule: [ScheduleItem]
    let lastPrayedAt: Double
    var everyOpen: Bool { mode == "every-open" }
  }

  // MARK: storage

  static func saveSelection(_ selection: FamilyActivitySelection) {
    if let data = try? JSONEncoder().encode(selection) {
      defaults.set(data, forKey: selectionKey)
    }
  }

  static func loadSelection() -> FamilyActivitySelection? {
    guard let data = defaults.data(forKey: selectionKey) else { return nil }
    return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
  }

  static func selectionCount() -> Int {
    guard let s = loadSelection() else { return 0 }
    return s.applicationTokens.count + s.categoryTokens.count + s.webDomainTokens.count
  }

  static func saveConfig(json: String) {
    defaults.set(json, forKey: configKey)
    // The app's "last prayed" wins only if newer.
    if let cfg = loadConfig(), cfg.lastPrayedAt > lastPrayedAt() {
      defaults.set(cfg.lastPrayedAt, forKey: lastPrayedAtKey)
    }
  }

  /// Epoch ms of the last "I've prayed".
  static func lastPrayedAt() -> Double {
    defaults.double(forKey: lastPrayedAtKey)
  }

  /// "I've prayed": settles every prayer time that is due and lifts the shield.
  static func markPrayed(epochMs: Double) {
    defaults.set(epochMs, forKey: lastPrayedAtKey)
    reapplyIfNeeded()
  }

  static func loadConfig() -> Config? {
    guard let json = defaults.string(forKey: configKey), let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(Config.self, from: data)
  }

  // MARK: shield

  static func applyShield() {
    guard let s = loadSelection() else { return }
    store.shield.applications = s.applicationTokens.isEmpty ? nil : s.applicationTokens
    store.shield.applicationCategories = s.categoryTokens.isEmpty ? nil : .specific(s.categoryTokens)
    store.shield.webDomains = s.webDomainTokens.isEmpty ? nil : s.webDomainTokens
  }

  static func clearShield() {
    store.shield.applications = nil
    store.shield.applicationCategories = nil
    store.shield.webDomains = nil
  }

  static func isUnlocked(now: Date = Date()) -> Bool {
    defaults.double(forKey: unlockedUntilKey) > now.timeIntervalSince1970 + 5
  }

  /// The most recent moment, at or before now, that this time came round (epoch ms).
  static func latestOccurrence(_ item: ScheduleItem, now: Date) -> Double {
    let cal = Calendar.current
    var date = cal.date(bySettingHour: item.hour, minute: item.minute, second: 0, of: now) ?? now
    if date > now { date = cal.date(byAdding: .day, value: -1, to: date) ?? date }
    return date.timeIntervalSince1970 * 1000
  }

  /// A prayer time has come round since the last "I've prayed".
  static func prayerDue(now: Date = Date()) -> Bool {
    guard let cfg = loadConfig() else { return false }
    let last = lastPrayedAt()
    return cfg.schedule.contains { item in
      guard item.enabled else { return false }
      let at = latestOccurrence(item, now: now)
      return at >= item.since && at > last
    }
  }

  /// Puts the shield in the state the rules call for right now (mirrors src/core/gate.ts).
  static func reapplyIfNeeded(now: Date = Date()) {
    guard let cfg = loadConfig(), !cfg.gatedApps.isEmpty else { clearShield(); return }
    if prayerDue(now: now) { applyShield(); return }
    if cfg.everyOpen && !isUnlocked(now: now) { applyShield() } else { clearShield() }
  }

  // MARK: monitoring

  /// Registers one repeating DeviceActivity schedule per prayer time. The
  /// monitor extension turns the shield on when each one starts; it stays on
  /// until "I've prayed" (the 15-minute interval is only Apple's minimum length).
  static func startMonitoring() throws {
    let center = DeviceActivityCenter()
    center.stopMonitoring(center.activities.filter { $0.rawValue.hasPrefix(windowPrefix) })
    guard let cfg = loadConfig() else { clearShield(); return }
    for item in cfg.schedule where item.enabled {
      let endTotal = (item.hour * 60 + item.minute + minWindowMinutes) % 1440
      let schedule = DeviceActivitySchedule(
        intervalStart: DateComponents(hour: item.hour, minute: item.minute),
        intervalEnd: DateComponents(hour: endTotal / 60, minute: endTotal % 60),
        repeats: true
      )
      try center.startMonitoring(DeviceActivityName(windowPrefix + item.id), during: schedule)
    }
    reapplyIfNeeded()
  }

  /// Lifts the shield for `minutes` (at least 15, Apple's shortest schedule),
  /// then the monitor extension puts it back when the interval ends.
  static func unlock(minutes: Int, now: Date = Date()) throws {
    let length = max(minutes, minWindowMinutes)
    let end = now.addingTimeInterval(TimeInterval(length * 60))
    defaults.set(end.timeIntervalSince1970, forKey: unlockedUntilKey)
    clearShield()
    let parts: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
    let cal = Calendar.current
    let center = DeviceActivityCenter()
    center.stopMonitoring([unlockActivity])
    try center.startMonitoring(
      unlockActivity,
      during: DeviceActivitySchedule(
        intervalStart: cal.dateComponents(parts, from: now),
        intervalEnd: cal.dateComponents(parts, from: end),
        repeats: false
      )
    )
  }

  // MARK: events recorded by extensions (read back into the app's stats)

  static func recordEvent(_ outcome: String) {
    var list = defaults.array(forKey: eventsKey) as? [[String: Any]] ?? []
    list.append(["at": Date().timeIntervalSince1970 * 1000, "outcome": outcome])
    defaults.set(Array(list.suffix(500)), forKey: eventsKey)
  }

  static func drainEvents() -> [[String: Any]] {
    let list = defaults.array(forKey: eventsKey) as? [[String: Any]] ?? []
    defaults.removeObject(forKey: eventsKey)
    return list
  }
}
