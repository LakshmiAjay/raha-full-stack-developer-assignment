type BreakRecord = {
  startedAt: Date;
  autoEndsAt: Date;
  endedAt?: Date;
  durationMinutes?: number;
};
type BreakDay = { breaks?: BreakRecord[] };

export function effectiveActiveBreak(day: BreakDay, now = new Date()) {
  return day.breaks?.find(
    (item) => !item.endedAt && item.autoEndsAt.getTime() > now.getTime(),
  );
}

export function breakUsageMinutes(days: BreakDay[], now = new Date()) {
  return days.reduce(
    (dayTotal, day) =>
      dayTotal +
      (day.breaks ?? []).reduce((total, item) => {
        if (item.durationMinutes !== undefined)
          return total + item.durationMinutes;
        const effectiveEnd = item.endedAt
          ? item.endedAt
          : new Date(Math.min(now.getTime(), item.autoEndsAt.getTime()));
        return (
          total +
          Math.max(0, effectiveEnd.getTime() - item.startedAt.getTime()) / 60000
        );
      }, 0),
    0,
  );
}

export function breakSummary(
  days: BreakDay[],
  allowanceMinutes: number,
  now = new Date(),
) {
  const active = days.map((day) => effectiveActiveBreak(day, now)).find(Boolean),
    used = breakUsageMinutes(days, now),
    roundedUsed = Math.round(used * 10) / 10;
  return {
    onBreak: Boolean(active),
    activeBreakStartedAt: active?.startedAt,
    activeBreakEndsAt: active?.autoEndsAt,
    breakUsedMinutesToday: roundedUsed,
    breakAllowanceMinutesToday: allowanceMinutes,
    breakRemainingMinutesToday:
      Math.max(0, Math.round((allowanceMinutes - used) * 10) / 10),
  };
}
