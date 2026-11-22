package org.pauseandpray.appgate

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AppGateModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not ready" }

  override fun definition() = ModuleDefinition {
    Name("AppGate")

    Function("setConfig") { json: String ->
      GateStore.saveConfig(context, json)
    }

    Function("unlock") { app: String, minutes: Int ->
      GateStore.unlock(context, app, minutes)
    }

    AsyncFunction("getInstalledApps") {
      val pm = context.packageManager
      val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      pm.queryIntentActivities(launcher, 0)
        .map { it.activityInfo.packageName to it.loadLabel(pm).toString() }
        .filter { it.first != context.packageName }
        .distinctBy { it.first }
        .map { mapOf("packageName" to it.first, "label" to it.second) }
    }

    Function("isAccessibilityServiceEnabled") {
      val expected = ComponentName(context, GateAccessibilityService::class.java)
      val enabled = Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
      ) ?: ""
      enabled.split(':').any { ComponentName.unflattenFromString(it) == expected }
    }

    Function("openAccessibilitySettings") {
      context.startActivity(
        Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    Function("canDrawOverlays") {
      Settings.canDrawOverlays(context)
    }

    Function("openOverlaySettings") {
      context.startActivity(
        Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    Function("openApp") { packageName: String ->
      val intent = context.packageManager.getLaunchIntentForPackage(packageName)
        ?: return@Function false
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      true
    }
  }
}
