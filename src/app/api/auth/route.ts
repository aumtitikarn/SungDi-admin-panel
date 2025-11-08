// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

type ProxyResult = { ok: boolean; status: number; data: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function proxyJson(path: string, body: unknown): Promise<ProxyResult> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isRecord(body) ? body : {}),
  });
  const data: unknown = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") ?? "";
  let body: unknown = undefined;
  try {
    body = await req.json();
  } catch {
    // ไม่มี body ก็ไม่เป็นไร
  }

  switch (action) {
    case "register": {
      const result = await proxyJson("/api/auth/register", body);
      return NextResponse.json(result.data, { status: result.status });
    }

    case "login": {
      const result = await proxyJson("/api/auth/login", body);
      if (!result.ok) {
        return NextResponse.json(result.data, { status: result.status });
      }

      // คาดหวังรูปแบบ { idToken, expiresIn }
      let idToken = "";
      let maxAgeSec = 3600;
      if (isRecord(result.data)) {
        if (typeof result.data.idToken === "string") idToken = result.data.idToken;
        const ex = result.data.expiresIn;
        if (typeof ex === "string" && /^\d+$/.test(ex)) maxAgeSec = parseInt(ex, 10);
        if (typeof ex === "number" && Number.isFinite(ex)) maxAgeSec = ex;
      }

      const res = NextResponse.json({ ok: true });
      if (idToken) {
        res.cookies.set("idToken", idToken, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: maxAgeSec, // วินาที
        });
      }
      return res;
    }

    case "logout": {
      const res = NextResponse.json({ ok: true });
      // ลบคุกกี้ฝั่ง Next
      res.cookies.set("idToken", "", { path: "/", maxAge: 0 });

      // (ทางเลือก) แจ้ง backend ด้วย แต่ไม่ให้ fail กระทบ response
      fetch(`${BASE}/api/auth/logout`, { method: "POST" }).catch(() => {});
      return res;
    }

    case "verify": {
      // อ่าน token จาก body หรือคุกกี้
      let idToken: string | undefined = req.cookies.get("idToken")?.value;
      if (isRecord(body) && typeof body.idToken === "string") idToken = body.idToken;

      const result = await proxyJson("/api/auth/verify", { idToken });
      return NextResponse.json(result.data, { status: result.status });
    }

    default:
      return NextResponse.json({ error: "unknown_action" }, { status: 404 });
  }
}
