package expo.modules.usagestats

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * How long apps were on screen, from Android's usage event log.
 *
 * This only reports stretches of foreground time. Splitting them into days,
 * adding them up and deciding whether a day went over a limit is done in JS
 * (lib/screenTime), where it can be tested; the native side stays a reader.
 */
class UsageStatsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("UsageStats")

    /** Whether the user has turned on usage access for Pulsar. */
    Function("hasAccess") { hasAccess() }

    /** Opens Settings → usage access, on Pulsar's own switch where Android allows it. */
    Function("openAccessSettings") { openAccessSettings() }

    /** Foreground stretches of the given packages, `{ pkg, start, end }` in ms. */
    AsyncFunction("sessions") { packages: List<String>, from: Double, to: Double ->
      val wanted = packages.toSet()
      collect(from.toLong(), to.toLong()) { it in wanted }
    }

    /** The apps used most between `from` and `to`, `{ pkg, label, minutes }`, most first. */
    AsyncFunction("topApps") { from: Double, to: Double, limit: Int ->
      topApps(from.toLong(), to.toLong(), limit)
    }
  }

  private val context: Context?
    get() = appContext.reactContext

  private fun hasAccess(): Boolean {
    val context = context ?: return false
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun openAccessSettings() {
    val context = context ?: return
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      data = Uri.parse("package:${context.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    try {
      context.startActivity(intent)
    } catch (_: Exception) {
      // Some builds of Android have no per-app page for usage access.
      context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }

  private fun collect(from: Long, to: Long, keep: (String) -> Boolean): List<Map<String, Any>> {
    val context = context ?: return emptyList()
    if (!hasAccess()) return emptyList()
    val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = manager.queryEvents(from, to)
    val event = UsageEvents.Event()
    // Keyed by package and activity: an app moving between two of its own
    // screens pauses one and resumes the other, and JS joins the pieces.
    val open = HashMap<String, Long>()
    val out = ArrayList<Map<String, Any>>()

    fun close(key: String, at: Long) {
      val start = open.remove(key) ?: return
      if (at > start) out.add(mapOf("pkg" to key.substringBefore('/'), "start" to start.toDouble(), "end" to at.toDouble()))
    }

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val pkg = event.packageName ?: continue
      when (event.eventType) {
        RESUMED -> if (keep(pkg)) open.putIfAbsent("$pkg/${event.className}", event.timeStamp)
        PAUSED, STOPPED -> close("$pkg/${event.className}", event.timeStamp)
        SCREEN_OFF, SHUTDOWN -> open.keys.toList().forEach { close(it, event.timeStamp) }
      }
    }
    val now = minOf(to, System.currentTimeMillis())
    open.keys.toList().forEach { close(it, now) }
    return out
  }

  private fun topApps(from: Long, to: Long, limit: Int): List<Map<String, Any>> {
    val context = context ?: return emptyList()
    val pm = context.packageManager
    val home = pm.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)?.activityInfo?.packageName
    val totals = HashMap<String, Double>()
    for (session in collect(from, to) { it != context.packageName && it != home }) {
      val pkg = session["pkg"] as String
      totals[pkg] = (totals[pkg] ?: 0.0) + ((session["end"] as Double) - (session["start"] as Double)) / 60_000.0
    }
    return totals.entries
      .filter { pm.getLaunchIntentForPackage(it.key) != null }
      .sortedByDescending { it.value }
      .take(limit)
      .map { (pkg, minutes) -> mapOf("pkg" to pkg, "label" to labelOf(pkg), "minutes" to minutes) }
  }

  private fun labelOf(pkg: String): String =
    try {
      val pm = context!!.packageManager
      pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
    } catch (_: Exception) {
      pkg
    }

  private companion object {
    // UsageEvents.Event types by value: the named constants for 1, 2 and 23
    // arrived in API 29, and this module runs from 26.
    const val RESUMED = 1
    const val PAUSED = 2
    const val SCREEN_OFF = 16
    const val STOPPED = 23
    const val SHUTDOWN = 26
  }
}
