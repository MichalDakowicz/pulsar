import type { BuilderState } from '@/features/builder/useBuilder';

/**
 * One step of the builder. Every step takes the whole draft and a setter rather
 * than its own slice, because several of them read a field another step owns —
 * the target step branches on the kind picked in step one, and the commitment
 * step reads the cadence to write the pledge.
 */
export type StepProps = {
  state: BuilderState;
  set: <K extends keyof BuilderState>(key: K, value: BuilderState[K]) => void;
};

/** Offered reminder times. Not a clock picker: five good defaults beat a spinner. */
export const TIME_OPTIONS = ['07:00', '07:30', '08:00', '12:00', '17:30', '19:00', '21:00', '22:30'];
