package expo.modules.healthreminders

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HealthRemindersModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HealthReminders")
    AsyncFunction("supportsBackgroundReads") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      try {
        HealthConnectClient.getOrCreate(context).features.getFeatureStatus(
          HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND
        ) == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
      } catch (_: Exception) { false }
    }
  }
}
