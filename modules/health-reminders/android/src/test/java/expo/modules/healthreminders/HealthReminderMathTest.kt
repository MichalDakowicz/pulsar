package expo.modules.healthreminders

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId

class HealthReminderMathTest {
  private val zone = ZoneId.of("Europe/Warsaw")
  private fun at(value: String) = LocalDateTime.parse(value).atZone(zone).toInstant()
  private fun span(start: String, end: String) = HealthSpan(at(start), at(end))
  private fun gate() = JSONObject().put("version", 1).put("kind", "do").put("target", 1)
    .put("exerciseTypes", JSONArray(List(84) { it == 70 })).put("otherExercise", false)
    .put("minimumMinutes", 30).put("minimumMode", "session")
    .put("days", JSONArray().put(JSONObject().put("day", "2026-10-15").put("amount", 0).put("read", true)))

  @Test fun overlappingCopiesNeverMeetDailyMinimumTwice() {
    val twenty = Workout(span("2026-10-15T07:00", "2026-10-15T07:20"), 70)
    val link = gate().put("minimumMode", "day")
    assertFalse(HealthReminderMath.complete(link, HealthReminderMath.exercise(listOf(twenty, twenty), link, zone)))
    val ten = Workout(span("2026-10-15T18:00", "2026-10-15T18:10"), 70)
    assertTrue(HealthReminderMath.complete(link, HealthReminderMath.exercise(listOf(twenty, ten), link, zone)))
    link.put("minimumMode", "session")
    assertFalse(HealthReminderMath.complete(link, HealthReminderMath.exercise(listOf(twenty, ten), link, zone)))
    val thirty = Workout(span("2026-10-15T19:00", "2026-10-15T19:30"), 70)
    assertTrue(HealthReminderMath.complete(link, HealthReminderMath.exercise(listOf(thirty), link, zone)))
    assertFalse(HealthReminderMath.complete(link, HealthReminderMath.exercise(listOf(thirty.copy(type = 79)), link, zone)))
  }

  @Test fun bedtimeGraceIncludesMidnightButRejectsLateOrShortSleep() {
    val link = gate().put("bedtime", "23:55").put("bedtimeGrace", 15).put("minNight", 180)
    fun sleep(start: String, end: String = "2026-10-16T07:00"): Map<String, Double> {
      val time = span(start, end)
      return HealthReminderMath.sleep(listOf(Night(time, listOf(time))), link, zone)
    }
    assertEquals(1.0, sleep("2026-10-16T00:08")["2026-10-15"]!!, 0.0)
    assertEquals(0.0, sleep("2026-10-16T00:11")["2026-10-15"]!!, 0.0)
    assertTrue(sleep("2026-10-15T23:50", "2026-10-16T00:50").isEmpty())
  }

  @Test fun readingsLiftAmountsWithoutOverrulingProtectedDays() {
    val link = gate().put("target", 100)
    assertFalse(HealthReminderMath.complete(link, mapOf("2026-10-15" to 99.0)))
    assertTrue(HealthReminderMath.complete(link, mapOf("2026-10-15" to 100.0)))
    link.getJSONArray("days").getJSONObject(0).put("read", false)
    assertFalse(HealthReminderMath.complete(link, mapOf("2026-10-15" to 100.0)))
    link.getJSONArray("days").getJSONObject(0).put("amount", 100)
    assertTrue(HealthReminderMath.complete(link, emptyMap()))
  }

  @Test fun weeklyTargetsUseMaxOfManualAndHealthPerDay() {
    val link = gate().put("target", 100).put("days", JSONArray()
      .put(JSONObject().put("day", "2026-10-14").put("amount", 40).put("read", true))
      .put(JSONObject().put("day", "2026-10-15").put("amount", 0).put("read", true)))
    assertFalse(HealthReminderMath.complete(link, mapOf("2026-10-14" to 40.0, "2026-10-15" to 20.0)))
    assertTrue(HealthReminderMath.complete(link, mapOf("2026-10-15" to 60.0)))
  }

  @Test fun durationAndLegacySleepUseTheMorningOfTheWholeSession() {
    val night = Night(span("2026-10-14T23:00", "2026-10-15T07:00"), listOf(
      span("2026-10-14T23:00", "2026-10-14T23:30"), span("2026-10-14T23:30", "2026-10-15T07:00")))
    val link = gate()
    assertEquals(mapOf("2026-10-15" to 1.0), HealthReminderMath.sleep(listOf(night), link, zone))
    link.put("kind", "timer")
    assertEquals(mapOf("2026-10-15" to 480.0), HealthReminderMath.sleep(listOf(night), link, zone))
  }

  @Test fun aHandLoggedWorkoutCountsWithoutAMinimumButNotWithOne() {
    val workout = Workout(span("2026-10-15T18:00", "2026-10-15T18:00"), 70)
    val link = gate()
    link.remove("minimumMinutes")
    assertEquals(1.0, HealthReminderMath.exercise(listOf(workout), link, zone)["2026-10-15"]!!, 0.0)
    link.put("minimumMinutes", 30)
    assertTrue(HealthReminderMath.exercise(listOf(workout), link, zone).isEmpty())
  }
}
