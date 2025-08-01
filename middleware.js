import { NextResponse } from "next/server"

export function middleware(request) {
  // Only protect API routes (except auth routes)
  if (request.nextUrl.pathname.startsWith("/api") && !request.nextUrl.pathname.startsWith("/api/auth")) {
    const token = request.cookies.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      // Simple token validation - in production, use proper JWT verification
      if (token && token.length > 10) {
        return NextResponse.next()
      } else {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
      }
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*"],
}
