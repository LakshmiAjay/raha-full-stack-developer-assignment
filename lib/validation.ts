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
