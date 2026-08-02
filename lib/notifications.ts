import { db } from "./db";
import {
  demoEnabled,
  demoId,
  demoNotifications,
} from "./demo";
import type { NotificationType } from "./types";
import { ObjectId } from "mongodb";

export async function createSessionNotification(input: {
  type: NotificationType;
  recipientId: string;
  actorId: string;
  actorName: string;
  branchId: string;
  dayId: string;
  sessionNumber: number;
  createdAt: Date;
}) {
  if (demoEnabled()) {
    demoNotifications().unshift({ _id: demoId(), ...input });
    return;
  }
  await (await db()).collection("notifications").insertOne({
    ...input,
    recipientId: new ObjectId(input.recipientId),
    actorId: new ObjectId(input.actorId),
    branchId: new ObjectId(input.branchId),
    dayId: new ObjectId(input.dayId),
  });
}
