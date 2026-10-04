import Svg, { Path } from 'react-native-svg';

import { markFor } from '@/components/markTable';

/** A habit's mark, drawn from the table in `markTable`. */

type MarkProps = {
  mark: string;
  size?: number;
  color: string;
};

export function Mark({ mark, size = 20, color }: MarkProps) {
  const def = markFor(mark);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={def.d}
        stroke={color}
        strokeWidth={def.width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
