import { hash } from "bcryptjs";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  demoEnabled,
  demoUsers,
  setDemoPassword,
} from "@/lib/demo";
import { apiError, unauthorized } from "@/lib/http";
import type { User } from "@/lib/types";
import { createAssociateSchema } from "@/lib/validation";
import { DEFAULT_PASSWORD } from "@/lib/password";

export async function GET() {
  const session = await requireSession("head");
  if (!session) return unauthorized();
  if (demoEnabled())
    return NextResponse.json({
      users: demoUsers.filter(
        (user) =>
          user.role === "associate" && user.managerId === session.userId,
      ),
      demo: true,
    });
  const users = await (await db())
    .collection<User>("users")
    .find({
      role: "associate",
      managerId: new ObjectId(session.userId),
      branchId: new ObjectId(session.branchId),
    })
    .project({ name: 1, email: 1, createdAt: 1, passwordChangedAt: 1 })
    .sort({ name: 1 })
    .toArray();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await requireSession("head");
  if (!session) return unauthorized();
  try {
    const details = createAssociateSchema.parse(await request.json()),
      password = DEFAULT_PASSWORD,
      createdAt = new Date();
    if (demoEnabled()) {
      if (demoUsers.some((user) => user.email === details.email))
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 },
        );
      const user = {
        _id: new ObjectId().toHexString(),
        ...details,
        role: "associate" as const,
        branchId: session.branchId,
        managerId: session.userId,
        createdAt,
      };
      demoUsers.push(user);
      setDemoPassword(user._id, password);
      return NextResponse.json({ user, initialPassword: password }, { status: 201 });
    }
    const database = await db();
    if (await database.collection<User>("users").findOne({ email: details.email }))
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    const user: Omit<User, "_id"> = {
      ...details,
      passwordHash: await hash(password, 12),
      role: "associate",
      branchId: new ObjectId(session.branchId),
      managerId: new ObjectId(session.userId),
      createdAt,
    };
    const result = await database
      .collection<Omit<User, "_id">>("users")
      .insertOne(user);
    return NextResponse.json(
      {
        user: { _id: result.insertedId, name: user.name, email: user.email, createdAt },
        initialPassword: password,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    return apiError(error);
  }
}
