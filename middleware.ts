import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // If logged in and trying to access login/register, redirect to home
    if (req.nextauth.token && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/home", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public paths — always allowed
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/register") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/inbox") ||
          pathname.startsWith("/_next") ||
          pathname.startsWith("/icons") ||
          pathname.startsWith("/uploads") ||
          pathname === "/favicon.ico" ||
          pathname === "/manifest.json" ||
          pathname === "/tayrona-logo.png" ||
          pathname.endsWith(".png") ||
          pathname.endsWith(".svg") ||
          pathname.endsWith(".jpg") ||
          pathname.endsWith(".webp")
        ) {
          return true;
        }

        // Everything else requires auth
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|tayrona-logo\\.png|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)"],
};
