import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Generate a cryptographically random nonce for every request.
  // This allows us to remove 'unsafe-inline' from script-src.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_AUTH_API_BASE ?? "";
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "";

  const csp = [
    "default-src 'self'",
    // Nonce covers Next.js hydration + our inline JSON-LD script.
    // strict-dynamic trusts scripts loaded by a nonced script, removing
    // the need for per-domain script allowlisting.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Tailwind uses inline styles; FontAwesome is loaded from cdnjs.
    `style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com`,
    // FontAwesome font files are served from cdnjs.
    `font-src 'self' https://cdnjs.cloudflare.com`,
    "img-src 'self' data: blob:",
    // Backend API and WebSocket connections.
    `connect-src 'self' ${apiUrl} ${wsUrl}`.trim(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
    .join("; ")
    .trim();

  // Forward the nonce to the layout via a request header so it can be
  // applied to inline <script> tags without exposing it in the URL.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    {
      // Apply to all routes except Next.js internals and static assets.
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
