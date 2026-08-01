import { NextResponse } from "next/server";
import { ZodError } from "zod";
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: "Please check the submitted details",
        issues: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  console.error(error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
export const unauthorized = () =>
  NextResponse.json(
    { error: "You are not allowed to access this resource" },
    { status: 403 },
  );
