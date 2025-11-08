// lib/authClient.ts
export type LoginInput = { email: string; password: string };
export type RegisterInput = { displayName: string; email: string; password: string };

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

/** Error ที่มีสถานะและโค้ด ใช้จับใน UI ได้ง่าย */
export class HttpError extends Error {
  status: number;
  code?: string;
  payload?: unknown;
  constructor(opts: { message: string; status: number; code?: string; payload?: unknown }) {
    super(opts.message);
    this.name = "HttpError";
    this.status = opts.status;
    this.code = opts.code;
    this.payload = opts.payload;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickMessage(payload: unknown): string {
  if (typeof payload === "string") return payload;

  if (isRecord(payload)) {
    if (typeof payload.message === "string") return payload.message;

    // โครงสร้างจาก backend ของเรา: { error: "EMAIL_EXISTS", message: "..." }
    if (typeof payload.error === "string") return payload.message as string ?? "เกิดข้อผิดพลาด";

    // โครง Firebase ดิบ: { error: { message: "EMAIL_EXISTS" } }
    const detail = isRecord(payload.detail) ? (payload.detail as Record<string, unknown>) : undefined;
    const innerErr = detail && isRecord(detail.error) ? (detail.error as Record<string, unknown>) : undefined;
    if (typeof innerErr?.message === "string") return innerErr.message;
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

function pickCode(payload: unknown): string | undefined {
  if (isRecord(payload)) {
    if (typeof payload.error === "string") return payload.error; // จาก backend
    const detail = isRecord(payload.detail) ? (payload.detail as Record<string, unknown>) : undefined;
    const innerErr = detail && isRecord(detail.error) ? (detail.error as Record<string, unknown>) : undefined;
    if (typeof innerErr?.message === "string") return innerErr.message; // จาก Firebase (e.g. EMAIL_EXISTS)
  }
  return undefined;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include",
  });

  let payload: unknown = undefined;
  try {
    payload = await res.json();
  } catch {
    // ignore body parse error
  }

  if (!res.ok) {
    const message = pickMessage(payload);
    const code = pickCode(payload);
    throw new HttpError({ message, status: res.status, code, payload });
  }

  return (payload ?? ({} as T)) as T;
}

export function register(input: RegisterInput) {
  // ถ้าเรียกผ่าน route รวมแบบ query ให้เปลี่ยนพาธเป็น "/api/auth?action=register"
  return json<{ uid: string; idToken: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput) {
  return json<{ uid: string; idToken: string; refreshToken: string; expiresIn: string }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function logout() {
  return json<{ ok: true }>("/api/auth/logout", { method: "POST" });
}
