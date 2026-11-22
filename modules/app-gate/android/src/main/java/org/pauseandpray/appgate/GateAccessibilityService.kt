package org.pauseandpray.appgate

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * Watches which app comes to the front. Reads only event.packageName; never
 * window content. When a gated app opens, it shows the Prayer Pause screen
 * through the app's deep link.
 */
class GateAccessibilityService : AccessibilityService() {
  private var lastPackage: String? = null
  private var lastLaunchMs = 0L

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    if (pkg == packageName) return

    val now = System.currentTimeMillis()
    if (!GateStore.shouldGate(this, pkg, now)) return
    // One app open fires several window events; show the pause once.
    if (pkg == lastPackage && now - lastLaunchMs < DEBOUNCE_MS) return
    lastPackage = pkg
    lastLaunchMs = now

    val uri = Uri.parse("$SCHEME://pause?app=${Uri.encode(pkg)}")
    val intent = Intent(Intent.ACTION_VIEW, uri)
      .setPackage(packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    try {
      startActivity(intent)
    } catch (e: Exception) {
      Log.w(TAG, "Could not open the Prayer Pause screen", e)
    }
  }

  override fun onInterrupt() = Unit

  companion object {
    private const val TAG = "PausePrayGate"
    private const val DEBOUNCE_MS = 3_000L
    /** Must match "scheme" in app.json. */
    const val SCHEME = "pauseandpray"
  }
}
