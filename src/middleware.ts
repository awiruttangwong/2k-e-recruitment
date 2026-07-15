import { NextRequest, NextResponse } from "next/server";

// Protects /admin/* with HTTP Basic Auth.
// Credentials: user "admin", password from the ADMIN_PASSWORD env var
// (set via `wrangler secret put ADMIN_PASSWORD` in production).
export function middleware(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;

  // Protection is opt-in: when no ADMIN_PASSWORD secret is configured the
  // admin stays open (per current owner decision). Setting the secret via
  // `wrangler secret put ADMIN_PASSWORD` turns Basic Auth on immediately.
  if (!expected) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const [user, pass] = atob(auth.slice(6)).split(":");
      if (user === "admin" && pass === expected) {
        return NextResponse.next();
      }
    } catch {
      // fall through to 401
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="2K E-Recruitment Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
