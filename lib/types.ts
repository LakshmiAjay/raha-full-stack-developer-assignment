import type { ObjectId } from "mongodb";
export type Role = "associate" | "head";
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
  endedAt?: Date;
  endLocation?: LocationPoint;
  totalDistanceKm?: number;
  distanceSource?: string;
};
