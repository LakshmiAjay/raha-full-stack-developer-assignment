import { z } from "zod";
import type { LocationPoint } from "./types";
export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().max(10000),
  capturedAt: z.coerce.date(),
});
export function localDateInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function logCapturedLocation(
  action: "day-start" | "visit-logged" | "route-sample" | "day-end",
  associateId: string,
  location: z.infer<typeof locationSchema>,
) {
  console.info("[device-location]", {
    action,
    associateId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyMeters: location.accuracy,
    capturedAt: location.capturedAt.toISOString(),
  });
}

export function shouldRecordRouteSample(
  samples: LocationPoint[],
  capturedAt: Date,
  minimumIntervalMs = 110_000,
) {
  const last = samples.at(-1);
  return (
    !last || capturedAt.getTime() - last.capturedAt.getTime() >= minimumIntervalMs
  );
}
