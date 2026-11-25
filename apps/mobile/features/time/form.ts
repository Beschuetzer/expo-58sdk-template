export function isValidMeTimeRange(
  startTime: Date | null,
  endTime: Date | null,
) {
  return (
    startTime instanceof Date &&
    Number.isFinite(startTime.getTime()) &&
    endTime instanceof Date &&
    Number.isFinite(endTime.getTime()) &&
    endTime.getTime() > startTime.getTime()
  );
}
