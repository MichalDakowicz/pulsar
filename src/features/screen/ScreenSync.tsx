import { useScreenSync } from '@/features/screen/useScreenSync';

// Renders nothing; mounted once from the root layout on Android, the only
// platform with usage to read.
export function ScreenSync() {
  useScreenSync();
  return null;
}
