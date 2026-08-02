import type { ObjectId } from "mongodb";
export type Role = "associate" | "head";
export type ApprovalType =
  | "lead_creation"
  | "holiday_work"
  | "session_start"
  | "session_end"
  | "break_extension";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalRequest = {
  _id: ObjectId;
  type: ApprovalType;
  status: ApprovalStatus;
  userId: ObjectId;
  managerId: ObjectId;
  branchId: ObjectId;
  requestedDate?: string;
  requestedTime?: string;
  reason: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
  decidedAt?: Date;
  decidedBy?: ObjectId;
  decisionNote?: string;
};
export type WorkPolicy = {
  managerId: ObjectId;
  branchId: ObjectId;
  timezone: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  saturdayHoliday: boolean;
  sundayHoliday: boolean;
  holidays: { date: string; name: string }[];
  updatedAt: Date;
};
export type LocationPoint = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: Date;
};
export type RouteCoordinate = Pick<LocationPoint, "latitude" | "longitude">;
export type User = {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  branchId: ObjectId;
  managerId?: ObjectId;
};
export type Lead = {
  _id: ObjectId;
  name: string;
  contact: string;
  location: { latitude: number; longitude: number };
  branchId: ObjectId;
};
export type Activity = {
  _id: ObjectId;
  leadId: ObjectId;
  leadName: string;
  notes: string;
  leadLocation?: { latitude: number; longitude: number };
  leadLocationDistanceMeters?: number;
  location: LocationPoint;
  createdAt: Date;
};
export type DaySession = {
  _id: ObjectId;
  userId: ObjectId;
  branchId: ObjectId;
  localDate: string;
  sessionNumber?: number;
  timezone: string;
  status: "active" | "completed";
  startedAt: Date;
  startLocation: LocationPoint;
  routeSamples?: LocationPoint[];
  routePath?: RouteCoordinate[];
  activities: Activity[];
  breaks?: {
    _id: ObjectId;
    startedAt: Date;
    plannedMinutes: number;
    autoEndsAt: Date;
    endedAt?: Date;
    durationMinutes?: number;
  }[];
  endedAt?: Date;
  endLocation?: LocationPoint;
  totalDistanceKm?: number;
  distanceSource?: string;
};
