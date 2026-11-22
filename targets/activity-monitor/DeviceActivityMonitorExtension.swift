import DeviceActivity
import Foundation

/// Turns the shield on at the start of each prayer window, and puts it back
/// when an "I've prayed" unlock runs out.
class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    if activity.rawValue.hasPrefix(GateShared.windowPrefix) {
      GateShared.reapplyIfNeeded()
    }
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    GateShared.reapplyIfNeeded()
  }
}
