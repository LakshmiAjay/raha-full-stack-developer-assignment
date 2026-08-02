import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
export async function middleware(request: NextRequest) {
  const token = request.cookies.get("raha_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/", request.url));
  try {
    const secret = new TextEncoder().encode(
        process.env.AUTH_SECRET ||
          "dev-only-secret-change-this-before-production",
      ),
      { payload } = await jwtVerify(token, secret),
      path = request.nextUrl.pathname;
    if (
      ((path.startsWith("/team") || path.startsWith("/users")) &&
        payload.role !== "head") ||
      ((path.startsWith("/today") || path.startsWith("/travel")) &&
        payload.role !== "associate")
    )
      return NextResponse.redirect(
        new URL(payload.role === "head" ? "/team" : "/today", request.url),
      );
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
export const config = {
  matcher: [
    "/today/:path*",
    "/travel/:path*",
    "/team/:path*",
    "/users/:path*",
    "/approvals/:path*",
  ],
};
