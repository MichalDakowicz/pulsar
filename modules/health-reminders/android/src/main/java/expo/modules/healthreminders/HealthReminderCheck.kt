@file:OptIn(androidx.health.connect.client.feature.ExperimentalMindfulnessSessionApi::class)

package expo.modules.healthreminders

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.MindfulnessSessionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.floor
import kotlin.reflect.KClass

object HealthReminderCheck {
  suspend fun isComplete(context: Context, gate: JSONObject): Boolean {
    if (gate.optInt("version") != 1) return false
    val client = HealthConnectClient.getOrCreate(context)
    val zone = ZoneId.systemDefault()
    val from = LocalDate.parse(gate.getString("from"))
    val through = LocalDate.parse(gate.getString("through"))
    val now = Instant.now()
    // Include the night before a morning and the morning after a bedtime.
    val start = from.minusDays(1).atStartOfDay(zone).toInstant()
    val end = minOf(through.plusDays(2).atStartOfDay(zone).toInstant(), now)
    if (start >= end) return false
    val found: Map<String, Double> = when (gate.getString("source")) {
      "exercise" -> {
        val workouts = read(client, ExerciseSessionRecord::class, start, end)
          .map { Workout(HealthSpan(it.startTime, it.endTime), it.exerciseType) }
        HealthReminderMath.exercise(workouts, gate, zone)
      }
      "sleep" -> {
        val nights = read(client, SleepSessionRecord::class, start, end).map { night ->
          val span = HealthSpan(night.startTime, night.endTime)
          val asleep = if (night.stages.isEmpty()) listOf(span) else night.stages.filter { it.stage != 1 && it.stage != 3 }
            .map { HealthSpan(it.startTime, it.endTime) }
          Night(span, asleep)
        }
        HealthReminderMath.sleep(nights, gate, zone)
      }
      "mindfulness" -> HealthReminderMath.byDay(read(client, MindfulnessSessionRecord::class, start, end)
        .map { HealthSpan(it.startTime, it.endTime) }, zone).mapValues { floor(it.value + 0.5) }
      "steps", "hydration", "distance" -> dailyAmounts(client, gate, from, through, zone, now)
      else -> return false
    }
    return HealthReminderMath.complete(gate, found)
  }

  private suspend fun dailyAmounts(client: HealthConnectClient, gate: JSONObject, from: LocalDate,
    through: LocalDate, zone: ZoneId, now: Instant): Map<String, Double> {
    val out = mutableMapOf<String, Double>()
    var day = from
    while (day <= through) {
      val start = day.atStartOfDay(zone).toInstant()
      val end = minOf(day.plusDays(1).atStartOfDay(zone).toInstant(), now)
      if (start < end) {
        val range = TimeRangeFilter.between(start, end)
        val amount = when (gate.getString("source")) {
          "steps" -> client.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), range))[StepsRecord.COUNT_TOTAL]?.toDouble() ?: 0.0
          "hydration" -> {
            val litres = client.aggregate(AggregateRequest(setOf(HydrationRecord.VOLUME_TOTAL), range))[HydrationRecord.VOLUME_TOTAL]?.inLiters ?: 0.0
            floor(litres * 1000 / gate.getDouble("waterMl") + 0.05)
          }
          else -> {
            val km = if (gate.getBoolean("filtered")) {
              val workouts = read(client, ExerciseSessionRecord::class, start, end).filter {
                it.startTime.atZone(zone).toLocalDate() == day && HealthReminderMath.counts(gate, it.exerciseType)
              }
              var sum = 0.0
              for (workout in workouts) {
                val sessionRange = TimeRangeFilter.between(workout.startTime, minOf(workout.endTime, now))
                sum += client.aggregate(AggregateRequest(setOf(DistanceRecord.DISTANCE_TOTAL), sessionRange))[DistanceRecord.DISTANCE_TOTAL]?.inKilometers ?: 0.0
              }
              sum
            } else client.aggregate(AggregateRequest(setOf(DistanceRecord.DISTANCE_TOTAL), range))[DistanceRecord.DISTANCE_TOTAL]?.inKilometers ?: 0.0
            floor(km + 0.05)
          }
        }
        out[day.toString()] = amount
      }
      day = day.plusDays(1)
    }
    return out
  }

  private suspend fun <T : Record> read(client: HealthConnectClient, type: KClass<T>, start: Instant, end: Instant): List<T> {
    val out = mutableListOf<T>()
    var page: String? = null
    repeat(10) {
      val response = client.readRecords(ReadRecordsRequest(type, TimeRangeFilter.between(start, end), pageSize = 1000, pageToken = page))
      out.addAll(response.records)
      page = response.pageToken
      if (page.isNullOrEmpty()) return out
    }
    // A truncated read cannot prove completion safely.
    error("Health Connect record limit exceeded")
  }
}
