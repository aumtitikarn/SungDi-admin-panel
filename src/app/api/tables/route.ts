// src/app/api/tables/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
export const runtime = "nodejs";

// ---------- types ----------
type JsonRecord = Record<string, unknown>;
type AuthHeaders = Record<string, string>;

// ---------- helpers ----------
async function getUidFromSession(req: NextRequest): Promise<string | undefined> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const uid =
    (token && typeof token.sub === "string" && token.sub) ||
    (token && typeof token === "object" && "uid" in token && typeof (token as JsonRecord).uid === "string" && ((token as JsonRecord).uid as string)) ||
    undefined;
  return uid;
}

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
  const uid = await getUidFromSession(req);

  if (uid) headers["x-user-id"] = uid;
  else if (token?.email) headers["x-user-email"] = token.email;

  return headers;
}

// ---------- handlers ----------
export async function GET(req: NextRequest) {
  try {
    const headers = await buildAuthHeadersFromSession(req);
    const uid = await getUidFromSession(req);
    const queryParams = new URLSearchParams();
    if (uid) queryParams.set("uid", uid);
    const queryString = queryParams.toString();
    const path = `/api/tables${queryString ? `?${queryString}` : ""}`;
    
    const r = await fetch(`${BASE}${path}`, {
      method: "GET",
      headers,
    });
    
    // ถ้า fetch ไม่สำเร็จ (เช่น backend ไม่มี) ให้ return empty data
    if (!r.ok && r.status >= 500) {
      console.warn(`Backend not available at ${BASE}${path}, returning empty data`);
      return NextResponse.json({ success: true, data: [], count: 0 });
    }
    
    const data: unknown = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (error) {
    console.error("Error fetching tables:", error);
    // Return empty array instead of error for GET requests
    return NextResponse.json({ success: true, data: [], count: 0 });
  }
}

async function proxyJson(path: string, body: JsonRecord | undefined, req: NextRequest): Promise<NextResponse> {
  try {
    const headers = await buildAuthHeadersFromSession(req);
    // เพิ่ม uid ใน body ถ้ายังไม่มี
    let finalBody = body;
    const uid = await getUidFromSession(req);
    if (uid && finalBody) {
      finalBody = { ...finalBody, uid };
    } else if (uid) {
      finalBody = { uid };
    }
    
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: finalBody ? JSON.stringify(finalBody) : undefined,
    });
    
    // ถ้า fetch ไม่สำเร็จ (เช่น backend ไม่มี)
    if (!r.ok && r.status >= 500) {
      console.warn(`Backend not available at ${BASE}${path}`);
      return NextResponse.json(
        { success: false, message: "Backend service is not available" },
        { status: 503 }
      );
    }
    
    const data: unknown = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (error) {
    console.error(`Error POST ${path}:`, error);
    return NextResponse.json(
      { success: false, message: "Backend service is not available" },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get("action") ?? "";
    let body: JsonRecord | undefined;
    
    try {
      body = (await req.json()) as JsonRecord;
    } catch {
      body = undefined;
    }

    if (action === "bulk") {
      return proxyJson("/api/tables/bulk", body, req);
    } else if (action === "single") {
      return proxyJson("/api/tables/single", body, req);
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 404 });
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { success: false, message: "Backend service is not available" },
      { status: 503 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tableNumber = req.nextUrl.searchParams.get("tableNumber");
    if (!tableNumber) {
      return NextResponse.json(
        { success: false, message: "tableNumber is required" },
        { status: 400 }
      );
    }

    const headers = await buildAuthHeadersFromSession(req);
    const uid = await getUidFromSession(req);
    const queryParams = new URLSearchParams();
    if (uid) queryParams.set("uid", uid);
    const queryString = queryParams.toString();
    const path = `/api/tables/${tableNumber}${queryString ? `?${queryString}` : ""}`;
    
    const r = await fetch(`${BASE}${path}`, {
      method: "DELETE",
      headers,
    });
    
    // ถ้า fetch ไม่สำเร็จ (เช่น backend ไม่มี)
    if (!r.ok && r.status >= 500) {
      console.warn(`Backend not available at ${BASE}/api/tables/${tableNumber}`);
      return NextResponse.json(
        { success: false, message: "Backend service is not available" },
        { status: 503 }
      );
    }
    
    const data: unknown = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (error) {
    console.error("Error deleting table:", error);
    return NextResponse.json(
      { success: false, message: "Backend service is not available" },
      { status: 503 }
    );
  }
}

