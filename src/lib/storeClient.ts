// lib/storeClient.ts
export type StorePersonal = {
  firstName?: string;
  lastName?: string;
  citizenId?: string;
  phone?: string;
  birthday?: string;
  email?: string;
};

export type StoreProfile = {
  shopName?: string;
  description?: string;
  address?: string;
  storeNumberPhone?: string;
  storeFacebook?: string | null;
  storeLine?: string | null;
  imageFile?: File | null; // optional
};

export type ProfileResponse = {
  personal: {
    uid: string;
    email: string;
    numberphone: string;
    firstName?: string;
    lastName?: string;
    citizenId?: string;
    phone?: string;
    birthday?: string;
    password?: string;
    createdAt?: unknown | null;
  } | null;
  store: {
    uid: string;
    shopName: string;
    description: string;
    address: string;
    storeNumberPhone: string;
    storeFacebook?: string | null;
    storeLine?: string | null;
    logoPath?: string | null;
    logoUrl?: string | null;
    updatedAt?: unknown | null;
  } | null;
};

const BASE = process.env.NEXT_PUBLIC_APP_BASE ?? ""; // ชี้มาที่ Next เอง


function pruneEmpty<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined) return;
    if (v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    out[k] = v;
  });
  return out as Partial<T>;
}

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
  if (isRecord(payload) && typeof payload.message === "string") return payload.message;
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include",
  });
  let payload: unknown;
  try { payload = await res.json(); } catch { payload = undefined; }
  if (!res.ok) throw new HttpError({ message: pickMessage(payload), status: res.status, payload });
  return (payload ?? ({} as T)) as T;
}

export async function saveStore(uid: string, personal: StorePersonal, store: StoreProfile) {
  const personalPayload = pruneEmpty(personal || {});
  const { imageFile, ...restStore } = store || {};
  const storePayload = pruneEmpty(restStore as Record<string, any>);

  // มีรูป → ใช้ multipart
  if (imageFile) {
    const form = new FormData();
    form.append("uid", uid);
    if (Object.keys(personalPayload).length) {
      form.append("personal", JSON.stringify(personalPayload));
    }
    form.append("store", JSON.stringify(storePayload));
    form.append("image", imageFile);

    const res = await fetch(`/api/store?action=save`, { method: "POST", body: form, credentials: "include" });
    const text = await res.text();
    if (!res.ok) throw new Error(text || "upload failed");
    try { return JSON.parse(text); } catch { return { ok: true, raw: text }; }
  }

  // ไม่มีรูป → JSON ธรรมดา
  const payload: any = { uid };
  if (Object.keys(personalPayload).length) payload.personal = personalPayload;
  if (Object.keys(storePayload).length) payload.store = storePayload;

  const res = await fetch(`/api/store?action=save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "save failed");
  try { return JSON.parse(text); } catch { return { ok: true, raw: text }; }
}

export function getUser(uid: string) {
  return json(`/api/store?action=user&uid=${encodeURIComponent(uid)}`);
}
export function getShop(uid: string) {
  return json(`/api/store?action=shop&uid=${encodeURIComponent(uid)}`);
}

// ให้ฟังก์ชันคืน Promise<ProfileResponse>
export function getProfile(uid: string): Promise<ProfileResponse> {
  return json<ProfileResponse>(`/api/store?action=profile&uid=${encodeURIComponent(uid)}`);
}
/** ใช้เป็น src ของ <img> ได้เลย: `/api/store?action=logo&uid=...` */
export function getLogoUrl(uid: string) {
  return `/api/store?action=logo&uid=${encodeURIComponent(uid)}`;
}

export async function updateAuthen(
  uid: string,
  payload: { email?: string | null; password?: string | null; confirmPassword?: string | null }
) {
  // กรองค่า null/undefined/สตริงว่าง ไม่ให้ไป overwrite ที่ backend โดยไม่ตั้งใจ
  const body: Record<string, unknown> = { uid };
  if (payload.email && payload.email.trim()) body.email = payload.email.trim();
  if (payload.password && payload.password.trim()) body.password = payload.password;
  if (payload.confirmPassword && payload.confirmPassword.trim()) body.confirmPassword = payload.confirmPassword;

  const res = await fetch("/api/store?action=updateAuthen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "update authen failed");
    throw new Error(msg);
  }
  return res.json();
}