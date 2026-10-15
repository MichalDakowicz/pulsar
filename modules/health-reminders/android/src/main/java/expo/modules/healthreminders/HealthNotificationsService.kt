package expo.modules.healthreminders

import android.content.Context
import android.content.Intent
import android.util.Log
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.service.NotificationsService
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull

/** Runs in Expo's goAsync receiver worker, including when React is not running. */
class HealthNotificationsService : NotificationsService() {
  override fun onReceiveNotification(context: Context, intent: Intent) {
    val notification = intent.getParcelableExtra<Notification>(NOTIFICATION_KEY)
    val gate = notification?.notificationRequest?.content?.body?.optJSONObject("pulsarHealth")
    if (gate != null) {
      val complete = try {
        runBlocking { withTimeoutOrNull(6000) { HealthReminderCheck.isComplete(context, gate) } } == true
      } catch (error: Exception) {
        Log.w("PulsarHealthReminder", "Read unavailable; delivering reminder", error)
        false
      }
      if (complete) {
        Log.i("PulsarHealthReminder", "Suppressed ${notification.notificationRequest.identifier}: health target met")
        return
      }
      Log.i("PulsarHealthReminder", "Delivering ${notification.notificationRequest.identifier}")
    }
    super.onReceiveNotification(context, intent)
  }
}
