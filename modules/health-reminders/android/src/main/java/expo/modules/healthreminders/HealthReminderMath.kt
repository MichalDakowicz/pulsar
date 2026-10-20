package expo.modules.healthreminders

import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import kotlin.math.floor
import kotlin.math.max

data class HealthSpan(val start: Instant, val end: Instant)
data class Workout(val span: HealthSpan, val type: Int)
data class Night(val span: HealthSpan, val asleep: List<HealthSpan>)

/** Counterpart of healthDays.ts for a receiver that cannot start React. */
object HealthReminderMath {
  fun minutes(spans: List<HealthSpan>): Double {
    var end = Long.MIN_VALUE
    var total = 0L
    for (span in spans.filter { it.end > it.start }.sortedBy { it.start }) {
      val start = max(span.start.toEpochMilli(), end)
      val nextEnd = span.end.toEpochMilli()
      if (nextEnd > start) total += nextEnd - start
      end = max(end, nextEnd)
    }
    return total / 60000.0
  }

  fun byDay(spans: List<HealthSpan>, zone: ZoneId, byEnd: Boolean = false): Map<String, Double> =
    spans.groupBy { (if (byEnd) it.end else it.start).atZone(zone).toLocalDate().toString() }
      .mapValues { minutes(it.value) }

  fun counts(gate: JSONObject, type: Int): Boolean {
    val types = gate.getJSONArray("exerciseTypes")
    return if (type in 0 until types.length()) types.getBoolean(type) else gate.getBoolean("otherExercise")
  }

  fun exercise(workouts: List<Workout>, gate: JSONObject, zone: ZoneId): Map<String, Double> {
    val check = gate.getString("kind") == "do"
    val minimum = if (check) gate.optDouble("minimumMinutes", 0.0) else 0.0
    val spans = workouts.filter { counts(gate, it.type) }
      .filter { !check || gate.optString("minimumMode") == "day" || minutes(listOf(it.span)) >= minimum }
      .map { it.span }
    return byDay(spans, zone).mapValues { (_, value) ->
      if (check) { if (value >= minimum) 1.0 else 0.0 } else floor(value + 0.5)
    }
  }

  fun sleep(nights: List<Night>, gate: JSONObject, zone: ZoneId): Map<String, Double> {
    val byMorning = nights.groupBy { it.span.end.atZone(zone).toLocalDate().toString() }
      .mapValues { (_, sessions) -> minutes(sessions.flatMap { it.asleep }) }
    if (gate.getString("kind") != "do") {
      return byMorning.mapValues { floor(it.value + 0.5) }
    }
    val bedtime = gate.optString("bedtime", "")
    if (bedtime.isEmpty()) return byMorning.mapValues { if (it.value > 0) 1.0 else 0.0 }
    val hhmm = bedtime.split(':').map { it.toInt() }
    val offset = (hhmm[0] * 60 + hhmm[1] - 720 + 1440) % 1440
    val candidates = nights.mapNotNull { night ->
      val start = night.asleep.minOfOrNull { it.start } ?: return@mapNotNull null
      val duration = minutes(night.asleep)
      if (duration < gate.getInt("minNight")) return@mapNotNull null
      Triple(start.minusSeconds(43200).atZone(zone).toLocalDate(), start, duration)
    }.groupBy { it.first }
    return candidates.mapValues { (day, options) ->
      val night = options.maxBy { it.third }
      val deadline = day.atStartOfDay(zone).toInstant().plusSeconds((720L + offset + gate.getInt("bedtimeGrace")) * 60)
      if (night.second <= deadline) 1.0 else 0.0
    }.mapKeys { it.key.toString() }
  }

  /** Existing manual amounts are floors; protected days cannot be changed by a reading. */
  fun complete(gate: JSONObject, found: Map<String, Double>): Boolean {
    if (gate.optInt("version") != 1 || gate.optDouble("target", 0.0) <= 0) return false
    val days = gate.getJSONArray("days")
    var total = 0.0
    for (index in 0 until days.length()) {
      val day = days.getJSONObject(index)
      val measured = if (day.getBoolean("read")) found[day.getString("day")] ?: 0.0 else 0.0
      total += max(day.getDouble("amount"), measured)
    }
    return total >= gate.getDouble("target")
  }
}
