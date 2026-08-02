import { db } from "./db";
import {
  demoApprovals,
  demoEnabled,
  demoPolicy,
  demoUser,
  demoUsers,
} from "./demo";
import type { ApprovalType } from "./types";
import { ObjectId } from "mongodb";

export type PolicyView = {
  managerId: string;
  branchId: string;
  timezone: string;
  startTime: string;
  endTime: string;
  holidays: { date: string; name: string }[];
};

export async function managerFor(userId: string) {
  if (demoEnabled()) return demoUser(userId)?.managerId;
  const user = await (await db()).collection("users").findOne(
    { _id: new ObjectId(userId), role: "associate" },
    { projection: { managerId: 1 } },
  );
  return user?.managerId ? String(user.managerId) : undefined;
}

export async function policyForAssociate(userId: string, branchId: string): Promise<PolicyView> {
  const managerId = await managerFor(userId);
  if (!managerId) throw new Error("This associate does not have a manager assigned");
  if (demoEnabled()) return { ...demoPolicy(), managerId, branchId };
  const stored = await (await db()).collection("workPolicies").findOne({
    managerId: new ObjectId(managerId),
    branchId: new ObjectId(branchId),
  });
  return {
    managerId,
    branchId,
    timezone: String(stored?.timezone ?? "Asia/Kolkata"),
    startTime: String(stored?.startTime ?? "09:00"),
    endTime: String(stored?.endTime ?? "18:00"),
    holidays: (stored?.holidays as PolicyView["holidays"] | undefined) ?? [],
  };
}

export function dateAndTimeInZone(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

export async function hasApproval(
  userId: string,
  type: ApprovalType,
  requestedDate: string,
) {
  if (demoEnabled())
    return demoApprovals().some(
      (request) =>
        request.userId === userId &&
        request.type === type &&
        request.requestedDate === requestedDate &&
        request.status === "approved",
    );
  return Boolean(
    await (await db()).collection("approvals").findOne({
      userId: new ObjectId(userId),
      type,
      requestedDate,
      status: "approved",
    }),
  );
}

export async function ensurePendingApproval(input: {
  userId: string;
  branchId: string;
  managerId: string;
  type: ApprovalType;
  requestedDate: string;
  requestedTime?: string;
  reason: string;
}) {
  if (demoEnabled()) {
    const existing = demoApprovals().find(
      (request) =>
        request.userId === input.userId &&
        request.type === input.type &&
        request.requestedDate === input.requestedDate &&
        request.status === "pending",
    );
    if (existing) return existing;
    const request = {
      _id: Math.floor(Date.now() / 1000).toString(16).padEnd(24, "a").slice(0, 24),
      status: "pending" as const,
      createdAt: new Date(),
      ...input,
    };
    demoApprovals().push(request);
    return request;
  }
  const database = await db();
  const filter = {
    userId: new ObjectId(input.userId),
    managerId: new ObjectId(input.managerId),
    type: input.type,
    requestedDate: input.requestedDate,
    status: "pending",
  };
  await database.collection("approvals").updateOne(
    filter,
    {
      $setOnInsert: {
        ...filter,
        branchId: new ObjectId(input.branchId),
        requestedTime: input.requestedTime,
        reason: input.reason,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  return database.collection("approvals").findOne(filter);
}

export async function managerNameMap(managerId: string) {
  if (demoEnabled())
    return new Map(
      demoUsers
        .filter((user) => user.managerId === managerId)
        .map((user) => [user._id, user.name]),
    );
  const users = await (await db())
    .collection("users")
    .find({ managerId: new ObjectId(managerId), role: "associate" })
    .project({ name: 1 })
    .toArray();
  return new Map(users.map((user) => [String(user._id), String(user.name)]));
}
