import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.AUTH_API_BASE || "http://localhost:4000";

async function forward(req: NextRequest, pathParts: string[]) {
  const url = new URL(req.url);
  const target = new URL(`/auth/${pathParts.join("/")}`, BASE);

  // Preserve query string
  target.search = url.search;

  const method = req.method;
  const headers = new Headers(req.headers);

  // Ensure we don't send host header
  headers.delete("host");

  // Forward body for non-GET/HEAD
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  const res = await fetch(target.toString(), {
    method,
    headers,
    body,
    // IMPORTANT: allow set-cookie to flow back
    redirect: "manual",
  });

  // Build NextResponse
  const out = new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  });

  return out;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
