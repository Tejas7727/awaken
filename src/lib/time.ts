import { format, addDays, startOfDay, setHours } from 'date-fns';

export function getEffectiveDay(now: Date, rolloverHour: number): string {
  // If current hour is before rollover, the "day" is still yesterday
  const d = now.getHours() < rolloverHour ? addDays(now, -1) : now;
  return format(d, 'yyyy-MM-dd');
}

export function getRolloverDate(dayString: string, rolloverHour: number): Date {
  const base = startOfDay(new Date(dayString + 'T00:00:00'));
  return setHours(addDays(base, 1), rolloverHour);
}
