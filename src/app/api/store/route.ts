// src/app/api/store/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
export const runtime = "nodejs";

// ---------- types ----------
type JsonRecord = Record<string, unknown>;
type AuthHeaders = Record<string, string>;

// fetch streaming init สำหรับ Node (เลี่ยง as any/never)
type NodeStreamInit = {
  method: "POST";
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
  duplex: "half";
};

// ---------- helpers ----------
async function buildAuthHeadersFromSession(req: NextRequest): Promise<AuthHeaders> {
  const headers: AuthHeaders = {};
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // ถ้าใช้ OAuth ที่ให้ access_token
  const accessToken =
    token && typeof token === "object" && "accessToken" in token && typeof (token as JsonRecord).accessToken === "string"
      ? ((token as JsonRecord).accessToken as string)
      : undefined;

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    return headers;
  }

  // ถ้าเป็น Credentials: แนบ uid/email เป็น header ภายใน (แล้วแต่ backend)
  const uid =
    (token && typeof token.sub === "string" && token.sub) ||
    (token && typeof (token as JsonRecord).uid === "string" && ((token as JsonRecord).uid as string)) ||
    undefined;

  if (uid) headers["x-user-id"] = uid;
  else if (token?.email) headers["x-user-email"] = token.email;

  return headers;
}

async function resolveUid(req: NextRequest): Promise<string | undefined> {
  const q = req.nextUrl.searchParams.get("uid");
  if (q) return q;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const t = (token ?? {}) as JsonRecord;
  return (t.uid as string | undefined) ?? (token?.sub as string | undefined) ?? (token?.email as string | undefined);
}

async function proxyJson(path: string, body: JsonRecord | undefined, req: NextRequest): Promise<NextResponse> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await buildAuthHeadersFromSession(req)) },
    body: JSON.stringify(body ?? {}),
  });
  const data: unknown = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}

async function proxyRaw(path: string, req: NextRequest): Promise<NextResponse> {
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("origin");
  const auth = await buildAuthHeadersFromSession(req);
  for (const [k, v] of Object.entries(auth)) headers.set(k, v);

  const init: NodeStreamInit = {
    method: "POST",
    headers,
    body: req.body,
    duplex: "half", // จำเป็นสำหรับ Node fetch เมื่อส่ง stream
  };

  const r = await fetch(`${BASE}${path}`, init);
  const buf = await r.arrayBuffer();
  return new NextResponse(buf, { status: r.status, headers: new Headers(r.headers) });
}

// ---------- handlers ----------
export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") ?? "";

  if (action === "save") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) {
      // multipart → ส่ง stream ตรง (ไร้ any)
      return proxyRaw("/api/store/save", req);
    }
    let body: JsonRecord | undefined;
    try {
      body = (await req.json()) as JsonRecord;
    } catch {
      body = undefined;
    }
    return proxyJson("/api/store/save", body, req);
  }
  if (action === "updateAuthen") {
    let body: JsonRecord | undefined;
    try { body = (await req.json()) as JsonRecord; } catch { body = undefined; }
    return proxyJson("/api/store/updateAuthen", body, req);
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 404 });
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") ?? "";
  const uid = await resolveUid(req);
  if (!uid) return NextResponse.json({ message: "missing uid" }, { status: 400 });

  const headers = await buildAuthHeadersFromSession(req);

  const passJson = async (url: string) => {
    const r = await fetch(url, { headers });
    const data: unknown = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  };

  switch (action) {
    case "profile":
      return passJson(`${BASE}/api/store/profile/${encodeURIComponent(uid)}`);
    case "user":
      return passJson(`${BASE}/api/users/${encodeURIComponent(uid)}`);
    case "shop":
      return passJson(`${BASE}/api/shop/${encodeURIComponent(uid)}`);
    case "logo": {
      const r = await fetch(`${BASE}/api/store/logo/${encodeURIComponent(uid)}`, { headers });
      const buf = await r.arrayBuffer();
      return new NextResponse(buf, { status: r.status, headers: new Headers(r.headers) });
    }
    default:
      return NextResponse.json({ error: "unknown_action" }, { status: 404 });
  }
}

