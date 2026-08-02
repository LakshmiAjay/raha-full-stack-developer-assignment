import { z } from "zod";
import { locationSchema } from "./location";
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export const startDaySchema = z.object({
  location: locationSchema,
  timezone: z.string().min(1).max(80),
});
export const activitySchema = z.object({
  leadId: z.string().regex(/^[a-f\d]{24}$/i),
  notes: z.string().trim().min(3).max(1000),
  location: locationSchema,
});
export const endDaySchema = z.object({ location: locationSchema });
export const routeSampleSchema = z.object({
  location: locationSchema.refine(
    (location) => location.accuracy <= 250,
    "Location accuracy must be within 250 metres",
  ),
});
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const approvalRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("lead_creation"),
    reason: z.string().trim().min(3).max(500),
    payload: z.object({
      name: z.string().trim().min(2).max(120),
      contact: z.string().trim().min(3).max(160),
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
    }),
  }),
  z.object({
    type: z.enum(["holiday_work", "session_start", "session_end"]),
    requestedDate: dateSchema,
    requestedTime: timeSchema.optional(),
    reason: z.string().trim().min(3).max(500),
  }),
]);
export const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(500).optional().default(""),
});
export const workPolicySchema = z.object({
  timezone: z.string().trim().min(1).max(80),
  startTime: timeSchema,
  endTime: timeSchema,
  saturdayHoliday: z.boolean(),
  sundayHoliday: z.boolean(),
  holidays: z
    .array(
      z.object({
        date: dateSchema,
        name: z.string().trim().min(2).max(100),
      }),
    )
    .max(100),
});
