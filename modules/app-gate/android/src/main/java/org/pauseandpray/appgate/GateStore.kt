package org.pauseandpray.appgate

import android.content.Context
import org.json.JSONObject
import java.util.Calendar

/**
 * Gate settings shared between the React Native app and the accessibility
 * service, kept in SharedPreferences. The rules mirror src/core/gate.ts and
 * src/core/schedule.ts: keep them in step.
 *
 *  1. A prayer time that has come round since the last "I've prayed" pauses
 *     the chosen apps until the user prays. No time limit, no skip.
 *  2. In "every open" mode the apps also pause on each open, outside an unlock window.
 */
object GateStore {
  private const val PREFS = "org.pauseandpray.appgate"
  private const val KEY_CONFIG = "config"
  private const val KEY_UNLOCKED = "unlockedUntil"
  private const val KEY_LAST_PRAYED = "lastPrayedAt"

  data class PrayerTime(val hour: Int, val minute: Int, val since: Long)
  data class Config(val gatedApps: Set<String>, val everyOpen: Boolean, val times: List<PrayerTime>)

  @Volatile private var cached: Config? = null

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun saveConfig(ctx: Context, json: String) {
    val parsed = parse(json)
    val lastPrayed = try { JSONObject(json).optLong("lastPrayedAt", -1L) } catch (e: Exception) { -1L }
    val edit = prefs(ctx).edit().putString(KEY_CONFIG, json)
    // The app's value wins only if newer (the service never moves it backwards).
    if (lastPrayed > lastPrayedAt(ctx)) edit.putLong(KEY_LAST_PRAYED, lastPrayed)
    edit.apply()
    cached = parsed
  }

  fun config(ctx: Context): Config =
    cached ?: parse(prefs(ctx).getString(KEY_CONFIG, null)).also { cached = it }

  private fun parse(json: String?): Config {
    if (json == null) return Config(emptySet(), false, emptyList())
    return try {
      val o = JSONObject(json)
      val apps = o.optJSONArray("gatedApps")
      val gated = (0 until (apps?.length() ?: 0)).map { apps!!.getString(it) }.toSet()
      val sched = o.optJSONArray("schedule")
      val times = (0 until (sched?.length() ?: 0))
        .map { sched!!.getJSONObject(it) }
        .filter { it.optBoolean("enabled") }
        .map { PrayerTime(it.getInt("hour"), it.getInt("minute"), it.optLong("since", 0L)) }
      Config(gated, o.optString("mode", "prayer-times") == "every-open", times)
    } catch (e: Exception) {
      Config(emptySet(), false, emptyList())
    }
  }

  fun lastPrayedAt(ctx: Context): Long = prefs(ctx).getLong(KEY_LAST_PRAYED, 0L)

  fun markPrayed(ctx: Context, nowMs: Long = System.currentTimeMillis()) {
    prefs(ctx).edit().putLong(KEY_LAST_PRAYED, nowMs).apply()
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

  /** The most recent moment, at or before now, that this time came round. */
  private fun latestOccurrence(t: PrayerTime, nowMs: Long): Long {
    val cal = Calendar.getInstance().apply {
      timeInMillis = nowMs
      set(Calendar.HOUR_OF_DAY, t.hour)
      set(Calendar.MINUTE, t.minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    if (cal.timeInMillis > nowMs) cal.add(Calendar.DAY_OF_MONTH, -1)
    return cal.timeInMillis
  }

  fun prayerDue(ctx: Context, nowMs: Long = System.currentTimeMillis()): Boolean {
    val last = lastPrayedAt(ctx)
    return config(ctx).times.any { t ->
      val at = latestOccurrence(t, nowMs)
      at >= t.since && at > last
    }
  }

  fun shouldGate(ctx: Context, app: String, nowMs: Long = System.currentTimeMillis()): Boolean {
    val cfg = config(ctx)
    if (app !in cfg.gatedApps) return false
    if (prayerDue(ctx, nowMs)) return true
    if (!cfg.everyOpen) return false
    return unlockedUntil(ctx, app) <= nowMs
  }
}
