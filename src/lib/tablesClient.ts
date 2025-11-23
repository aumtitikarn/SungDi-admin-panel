// src/lib/tablesClient.ts
export type TableItem = {
  tableNumber: number;
  qrUrl: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type TablesResponse = {
  success: boolean;
  data: TableItem[];
  count: number;
  message?: string;
};

export class TablesError extends Error {
  status: number;
  code?: string;
  payload?: unknown;
  
  constructor(opts: { message: string; status: number; code?: string; payload?: unknown }) {
    super(opts.message);
    this.name = "TablesError";
    this.status = opts.status;
    this.code = opts.code;
    this.payload = opts.payload;
  }
}

function pickMessage(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string") {
    return payload.message;
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include",
  });
  
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    payload = undefined;
  }
  
  if (!res.ok) {
    throw new TablesError({
      message: pickMessage(payload),
      status: res.status,
      payload,
    });
  }
  
  return (payload ?? ({} as T)) as T;
}

// ดึงรายการโต๊ะทั้งหมด
export async function getTables(): Promise<TablesResponse> {
  return json<TablesResponse>("/api/tables");
}

// สร้างโต๊ะแบบ bulk (ระบุจำนวน)
export async function createBulkTables(count: number): Promise<TablesResponse> {
  return json<TablesResponse>("/api/tables?action=bulk", {
    method: "POST",
    body: JSON.stringify({ count }),
  });
}

// สร้างโต๊ะแบบ single (ระบุเลขโต๊ะ)
export async function createSingleTable(tableNumber: number): Promise<TablesResponse> {
  return json<TablesResponse>("/api/tables?action=single", {
    method: "POST",
    body: JSON.stringify({ tableNumber }),
  });
}

// ลบโต๊ะ
export async function deleteTable(tableNumber: number): Promise<{ success: boolean; message: string }> {
  return json<{ success: boolean; message: string }>(
    `/api/tables?tableNumber=${encodeURIComponent(tableNumber)}`,
    {
      method: "DELETE",
    }
  );
}

