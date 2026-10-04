import { useHealthSync } from '@/features/health/useHealthSync';

// Renders nothing; mounted once from the root layout on Android, the only
// platform with a Health Connect to read.
export function HealthSync() {
  useHealthSync();
  return null;
}
