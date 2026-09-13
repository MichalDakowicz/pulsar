import { Text, View } from 'react-native';

import { ProgressRing } from '@/components/ui/ProgressRing';

type TodayHeroProps = {
  done: number;
  due: number;
  copy: string;
};

/**
 * The ring at the top of Today.
 *
 * It counts *due* habits, not all of them: on a day when only two of your four
 * are scheduled, "2/2" is the honest number and "2/4" is a guilt trip about
 * habits you were never going to do today. The source design had no notion of a
 * rest day, so it could only ever show the second one.
 */
export function TodayHero({ done, due, copy }: TodayHeroProps) {
  const progress = due === 0 ? 0 : done / due;

  return (
    <View className="items-center px-4 pb-1.5 pt-4">
      <ProgressRing progress={progress} size={208} stroke={10} inner>
        <View className="items-center gap-0.5">
          <Text className="text-foreground" style={{ fontSize: 46, lineHeight: 50, fontWeight: '700' }}>
            {done}
            <Text className="text-muted-foreground" style={{ fontSize: 26, fontWeight: '700' }}>
              /{due}
            </Text>
          </Text>
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            held today
          </Text>
        </View>
      </ProgressRing>
      <Text className="mt-3 max-w-[280px] text-center text-sm text-muted-foreground">{copy}</Text>
    </View>
  );
}

/**
 * What Today says under the ring.
 *
 * Four states, and the fourth is the one that stops the app nagging: a day
 * where nothing was scheduled is a rest day, not a failure, and it says so.
 */
export function heroCopy(options: {
  due: number;
  done: number;
  riskStreak: number | null;
  riskName: string | null;
  restCount: number;
}): string {
  const { due, done, riskStreak, riskName, restCount } = options;
  if (due === 0) {
    return restCount > 0
      ? 'nothing is due today. the streaks are safe — that is what a rest day is for.'
      : 'no habits yet. one is a good number to start with.';
  }
  if (done === due) return 'nothing left to lose today. sleep on a clean sheet.';
  const left = due - done;
  if (riskStreak && riskName) {
    return `${left} still open. ${riskStreak} days go down with ${riskName}.`;
  }
  return `${left} still open. close them before the day closes you.`;
}
