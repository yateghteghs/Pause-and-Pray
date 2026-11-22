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
    let windowMinutes: Int
  }

  struct Config: Codable {
    let gatedApps: [String]
    let mode: String
    let unlockMinutes: Int
    let schedule: [ScheduleItem]
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

  static func inPrayerWindow(_ cfg: Config, now: Date = Date()) -> Bool {
    let c = Calendar.current.dateComponents([.hour, .minute], from: now)
    let minutes = (c.hour ?? 0) * 60 + (c.minute ?? 0)
    return cfg.schedule.contains { item in
      guard item.enabled else { return false }
      let start = item.hour * 60 + item.minute
      let end = start + max(item.windowMinutes, minWindowMinutes)
      return end <= 1440 ? (minutes >= start && minutes < end) : (minutes >= start || minutes < end - 1440)
    }
  }

  /// Puts the shield in the state the settings call for right now.
  static func reapplyIfNeeded(now: Date = Date()) {
    guard let cfg = loadConfig(), !cfg.gatedApps.isEmpty else { clearShield(); return }
    if isUnlocked(now: now) { clearShield(); return }
    if cfg.everyOpen || inPrayerWindow(cfg, now: now) { applyShield() } else { clearShield() }
  }

  // MARK: monitoring

  /// Registers one repeating DeviceActivity schedule per prayer time, then sets the shield.
  static func startMonitoring() throws {
    let center = DeviceActivityCenter()
    center.stopMonitoring(center.activities.filter { $0.rawValue.hasPrefix(windowPrefix) })
    guard let cfg = loadConfig() else { clearShield(); return }
    if !cfg.everyOpen {
      for item in cfg.schedule where item.enabled {
        let endTotal = (item.hour * 60 + item.minute + max(item.windowMinutes, minWindowMinutes)) % 1440
        let schedule = DeviceActivitySchedule(
          intervalStart: DateComponents(hour: item.hour, minute: item.minute),
          intervalEnd: DateComponents(hour: endTotal / 60, minute: endTotal % 60),
          repeats: true
        )
        try center.startMonitoring(DeviceActivityName(windowPrefix + item.id), during: schedule)
      }
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
