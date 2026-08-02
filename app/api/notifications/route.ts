import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { demoEnabled, demoNotifications } from "@/lib/demo";
import { apiError, unauthorized } from "@/lib/http";
import type { SessionNotification } from "@/lib/types";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await requireSession("head");
    if (!session) return unauthorized();
    if (demoEnabled()) {
      const notifications = demoNotifications()
        .filter(
          (item) =>
            item.recipientId === session.userId &&
            item.branchId === session.branchId,
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 20);
      return NextResponse.json({
        notifications,
        unreadCount: notifications.filter((item) => !item.readAt).length,
      });
    }
    const notifications = await (await db())
      .collection<SessionNotification>("notifications")
      .find({
        recipientId: new ObjectId(session.userId),
        branchId: new ObjectId(session.branchId),
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((item) => !item.readAt).length,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH() {
  try {
    const session = await requireSession("head");
    if (!session) return unauthorized();
    const readAt = new Date();
    if (demoEnabled()) {
      for (const item of demoNotifications())
        if (
          item.recipientId === session.userId &&
          item.branchId === session.branchId &&
          !item.readAt
        )
          item.readAt = readAt;
    } else {
      await (await db()).collection("notifications").updateMany(
        {
          recipientId: new ObjectId(session.userId),
          branchId: new ObjectId(session.branchId),
          readAt: { $exists: false },
        },
        { $set: { readAt } },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
