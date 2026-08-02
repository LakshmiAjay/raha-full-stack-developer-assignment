import type {
  ApprovalStatus,
  ApprovalType,
  LocationPoint,
  RouteCoordinate,
} from "./types";
export const demoEnabled = () => !process.env.MONGODB_URI;
export const demoBranchId = "64b000000000000000000001";
export const demoUsers = [
  {
    _id: "64b000000000000000000011",
    name: "Meera Iyer",
    email: "meera@raha.in",
    role: "head" as const,
    branchId: demoBranchId,
  },
  {
    _id: "64b000000000000000000012",
    name: "Arjun Rao",
    email: "arjun@raha.in",
    role: "associate" as const,
    branchId: demoBranchId,
    managerId: "64b000000000000000000011",
  },
  {
    _id: "64b000000000000000000013",
    name: "Nisha Kapoor",
    email: "nisha@raha.in",
    role: "associate" as const,
    branchId: demoBranchId,
    managerId: "64b000000000000000000011",
  },
  {
    _id: "64b000000000000000000014",
    name: "Vikram Reddy",
    email: "vikram@raha.in",
    role: "associate" as const,
    branchId: demoBranchId,
    managerId: "64b000000000000000000011",
  },
];
export const demoLeads = [
  {
    _id: "64b000000000000000000021",
    name: "Lotus Diagnostics",
    contact: "Dr Ananya · 98480 11220",
    location: { latitude: 17.4429, longitude: 78.3772 },
    branchId: demoBranchId,
  },
  {
    _id: "64b000000000000000000022",
    name: "Savera Pharmacy",
    contact: "Karthik · 98480 22331",
    location: { latitude: 17.4375, longitude: 78.4483 },
    branchId: demoBranchId,
  },
  {
    _id: "64b000000000000000000023",
    name: "Madhapur Medicals",
    contact: "Sandeep · 98480 33442",
    location: { latitude: 17.4486, longitude: 78.3908 },
    branchId: demoBranchId,
  },
  {
    _id: "64b000000000000000000024",
    name: "Olive Health Centre",
    contact: "Rina · 98480 44553",
    location: { latitude: 17.4256, longitude: 78.4104 },
    branchId: demoBranchId,
  },
  {
    _id: "64b000000000000000000025",
    name: "Jubilee Care",
    contact: "Dr Farah · 98480 55664",
    location: { latitude: 17.4318, longitude: 78.4073 },
    branchId: demoBranchId,
  },
];
export type DemoActivity = {
  _id: string;
  leadId: string;
  leadName: string;
  notes: string;
  leadLocation?: { latitude: number; longitude: number };
  leadLocationDistanceMeters?: number;
  location: LocationPoint;
  createdAt: Date;
};
export type DemoDay = {
  _id: string;
  userId: string;
  branchId: string;
  localDate: string;
  sessionNumber?: number;
  timezone: string;
  status: "active" | "completed";
  startedAt: Date;
  startLocation: LocationPoint;
  routeSamples?: LocationPoint[];
  routePath?: RouteCoordinate[];
  activities: DemoActivity[];
  breaks?: {
    _id: string;
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
function history(): DemoDay[] {
  const rows: DemoDay[] = [];
  for (let u = 1; u < demoUsers.length; u++)
    for (let d = 1; d <= 5; d++) {
      const date = new Date();
      date.setDate(date.getDate() - (d + u));
      date.setHours(9, 15, 0, 0);
      const lead = demoLeads[(d + u) % demoLeads.length],
        p = (
          hour: number,
          latitude: number,
          longitude: number,
        ): LocationPoint => ({
          latitude,
          longitude,
          accuracy: 12 + d,
          capturedAt: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            hour,
            15,
          ),
        });
      rows.push({
        _id: `64c${u}${d}`.padEnd(24, "0"),
        userId: demoUsers[u]._id,
        branchId: demoBranchId,
        localDate: new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
        }).format(date),
        sessionNumber: 1,
        timezone: "Asia/Kolkata",
        status: "completed",
        startedAt: p(9, 17.4504, 78.3808).capturedAt,
        startLocation: p(9, 17.4504, 78.3808),
        routeSamples: [
          p(9, 17.4504, 78.3808),
          p(12, lead.location.latitude, lead.location.longitude),
          p(18, 17.4504, 78.3808),
        ],
        activities: [
          {
            _id: `64d${u}${d}`.padEnd(24, "0"),
            leadId: lead._id,
            leadName: lead.name,
            notes: "Discussed renewal and next month’s requirement.",
            leadLocation: { ...lead.location },
            leadLocationDistanceMeters: 0,
            location: p(12, lead.location.latitude, lead.location.longitude),
            createdAt: p(12, lead.location.latitude, lead.location.longitude)
              .capturedAt,
          },
        ],
        endedAt: p(18, 17.4504, 78.3808).capturedAt,
        endLocation: p(18, 17.4504, 78.3808),
        totalDistanceKm: Math.round((18 + d * 1.7 + u) * 10) / 10,
        distanceSource: "Demo road estimate",
      });
    }
  return rows;
}
export type DemoApproval = {
  _id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  userId: string;
  managerId: string;
  branchId: string;
  requestedDate?: string;
  requestedTime?: string;
  reason: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
  decidedAt?: Date;
  decisionNote?: string;
};
const state = globalThis as typeof globalThis & {
  rahaDemoDays?: DemoDay[];
  rahaDemoApprovals?: DemoApproval[];
  rahaDemoPolicy?: {
    managerId: string;
    branchId: string;
    timezone: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    saturdayHoliday: boolean;
    sundayHoliday: boolean;
    holidays: { date: string; name: string }[];
    updatedAt: Date;
  };
};
export const demoDays = () =>
  state.rahaDemoDays ?? (state.rahaDemoDays = history());
export const demoUser = (id: string) => demoUsers.find((u) => u._id === id);
export const demoId = () =>
  Math.floor(Date.now() / 1000)
    .toString(16)
    .padEnd(24, "0")
    .slice(0, 24);
export const demoApprovals = () =>
  state.rahaDemoApprovals ?? (state.rahaDemoApprovals = []);
export const demoPolicy = () =>
  state.rahaDemoPolicy ??
  (state.rahaDemoPolicy = {
    managerId: demoUsers[0]._id,
    branchId: demoBranchId,
    timezone: "Asia/Kolkata",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 60,
    saturdayHoliday: false,
    sundayHoliday: false,
    holidays: [],
    updatedAt: new Date(),
  });
