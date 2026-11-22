import DeviceActivity
import Foundation

/// Turns the shield on when each prayer time comes (it stays on until the user
/// prays in the app), and puts it back when an every-open unlock runs out.
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
