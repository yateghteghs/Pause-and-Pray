package org.pauseandpray.appgate

import android.content.Context
import org.json.JSONObject
import java.util.Calendar

/**
 * Gate settings shared between the React Native app and the accessibility
 * service, kept in SharedPreferences. The rules mirror src/core/gate.ts and
 * src/core/schedule.ts: keep them in step.
 */
object GateStore {
  private const val PREFS = "org.pauseandpray.appgate"
  private const val KEY_CONFIG = "config"
  private const val KEY_UNLOCKED = "unlockedUntil"
  private const val MIN_WINDOW_MINUTES = 15

  data class Window(val hour: Int, val minute: Int, val minutes: Int)
  data class Config(val gatedApps: Set<String>, val everyOpen: Boolean, val windows: List<Window>)

  @Volatile private var cached: Config? = null

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun saveConfig(ctx: Context, json: String) {
    prefs(ctx).edit().putString(KEY_CONFIG, json).apply()
    cached = parse(json)
  }

  fun config(ctx: Context): Config =
    cached ?: parse(prefs(ctx).getString(KEY_CONFIG, null)).also { cached = it }

  private fun parse(json: String?): Config {
    if (json == null) return Config(emptySet(), true, emptyList())
    return try {
      val o = JSONObject(json)
      val apps = o.optJSONArray("gatedApps")
      val gated = (0 until (apps?.length() ?: 0)).map { apps!!.getString(it) }.toSet()
      val sched = o.optJSONArray("schedule")
      val windows = (0 until (sched?.length() ?: 0))
        .map { sched!!.getJSONObject(it) }
        .filter { it.optBoolean("enabled") }
        .map { Window(it.getInt("hour"), it.getInt("minute"), it.optInt("windowMinutes", MIN_WINDOW_MINUTES)) }
      Config(gated, o.optString("mode", "every-open") == "every-open", windows)
    } catch (e: Exception) {
      Config(emptySet(), true, emptyList())
    }
  }

  fun unlock(ctx: Context, app: String, minutes: Int, nowMs: Long = System.currentTimeMillis()) {
    val p = prefs(ctx)
    val map = JSONObject(p.getString(KEY_UNLOCKED, "{}") ?: "{}")
    // Drop expired entries so the map stays small.
    map.keys().asSequence().toList().forEach { if (map.optLong(it) <= nowMs) map.remove(it) }
    map.put(app, nowMs + minutes * 60_000L)
    p.edit().putString(KEY_UNLOCKED, map.toString()).apply()
  }

  private fun unlockedUntil(ctx: Context, app: String): Long =
    JSONObject(prefs(ctx).getString(KEY_UNLOCKED, "{}") ?: "{}").optLong(app, 0L)

  fun shouldGate(ctx: Context, app: String, nowMs: Long = System.currentTimeMillis()): Boolean {
    val cfg = config(ctx)
    if (app !in cfg.gatedApps) return false
    if (unlockedUntil(ctx, app) > nowMs) return false
    if (cfg.everyOpen) return true
    return inWindow(cfg.windows, nowMs)
  }

  private fun inWindow(windows: List<Window>, nowMs: Long): Boolean {
    val cal = Calendar.getInstance().apply { timeInMillis = nowMs }
    val now = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
    return windows.any { w ->
      val start = w.hour * 60 + w.minute
      val end = start + maxOf(w.minutes, MIN_WINDOW_MINUTES)
      if (end <= 1440) now in start until end else now >= start || now < end - 1440
    }
  }
}
