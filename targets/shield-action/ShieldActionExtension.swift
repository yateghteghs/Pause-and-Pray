import ManagedSettings
import UserNotifications

/// Handles the shield buttons.
///
/// A shield action extension cannot open its parent app, so "Pray now" posts
/// a local notification; tapping it opens the Prayer Pause screen, and the
/// app lifts the shield after "I've prayed".
class ShieldActionExtension: ShieldActionDelegate {
  override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handle(action, completionHandler)
  }

  override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handle(action, completionHandler)
  }

  override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handle(action, completionHandler)
  }

  private func handle(_ action: ShieldAction, _ done: @escaping (ShieldActionResponse) -> Void) {
    switch action {
    case .primaryButtonPressed:
      let content = UNMutableNotificationContent()
      content.title = "Pause and pray"
      content.body = "Tap to pray. Your apps open when you have prayed."
      content.sound = .default
      // expo-notifications reads `data` from "body"; the top-level key is a fallback.
      content.userInfo = ["url": "/pause", "body": ["url": "/pause"]]
      let request = UNNotificationRequest(identifier: "pause-and-pray.pray-now", content: content, trigger: nil)
      UNUserNotificationCenter.current().add(request) { _ in done(.close) }
    case .secondaryButtonPressed:
      // Only offered outside prayer times. "Skip for now" opens the apps right away and is counted in the stats.
      if GateShared.prayerDue() {
        done(.close)
        return
      }
      GateShared.recordEvent("skipped")
      let minutes = GateShared.loadConfig()?.unlockMinutes ?? 15
      try? GateShared.unlock(minutes: minutes)
      done(.defer)
    @unknown default:
      done(.close)
    }
  }
}
