// src/app/api/menu/route.ts
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

  const accessToken =
    token && typeof token === "object" && "accessToken" in token && typeof (token as JsonRecord).accessToken === "string"
      ? ((token as JsonRecord).accessToken as string)
      : undefined;

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    return headers;
  }

  const uid = await getUidFromSession(req);

  if (uid) headers["x-user-id"] = uid;
  else if (token?.email) headers["x-user-email"] = token.email;

  return headers;
}

async function proxyRequest(
  req: NextRequest,
  path: string,
  method: string = "GET",
  bodyData?: unknown,
  addUidToBody: boolean = true
): Promise<NextResponse> {
  try {
    const headers = await buildAuthHeadersFromSession(req);
    
    // เพิ่ม uid ใน body ถ้าต้องการ
    let finalBodyData = bodyData;
    if (addUidToBody && method !== "GET" && bodyData && typeof bodyData === "object") {
      const uid = await getUidFromSession(req);
      if (uid) {
        finalBodyData = { ...(bodyData as Record<string, unknown>), uid };
      }
    }
    
    const fetchOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json", ...headers },
    };
    
    if (finalBodyData !== undefined) {
      fetchOptions.body = JSON.stringify(finalBodyData);
    }
    
    const r = await fetch(`${BASE}${path}`, fetchOptions);
    
    // ถ้า fetch ไม่สำเร็จ (เช่น backend ไม่มี) ให้ return empty data
    if (!r.ok && r.status >= 500) {
      console.warn(`Backend not available at ${BASE}${path}, returning empty data`);
      if (method === "GET") {
        return NextResponse.json({ success: true, data: [], count: 0 });
      }
      return NextResponse.json(
        { success: false, message: "Backend service is not available" },
        { status: 503 }
      );
    }
    
    const data: unknown = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (error) {
    console.error(`Error ${method} ${path}:`, error);
    // ถ้าเป็น GET ให้ return empty array แทน error
    if (method === "GET") {
      return NextResponse.json({ success: true, data: [], count: 0 });
    }
    return NextResponse.json(
      { success: false, message: `Failed to ${method} ${path}` },
      { status: 500 }
    );
  }
}

// ---------- handlers ----------
export async function GET(req: NextRequest) {
  // Express route: GET /api/menu?uid=...
  const uid = await getUidFromSession(req);
  const queryParams = new URLSearchParams();
  if (uid) queryParams.set("uid", uid);
  const queryString = queryParams.toString();
  const path = `/api/menu${queryString ? `?${queryString}` : ""}`;
  return proxyRequest(req, path, "GET");
}

async function proxyFormData(
  req: NextRequest,
  path: string,
  method: string = "POST"
): Promise<NextResponse> {
  try {
    const headers = await buildAuthHeadersFromSession(req);
    // ไม่ต้อง set Content-Type สำหรับ FormData (browser จะ set ให้เอง)
    delete headers["Content-Type"];
    
    // เพิ่ม uid ใน query string
    const uid = await getUidFromSession(req);
    const url = new URL(path, BASE);
    if (uid) {
      url.searchParams.set("uid", uid);
    }
    const finalPath = url.pathname + (url.search ? url.search : "");
    
    // สร้าง FormData ใหม่จาก request
    const incomingFormData = await req.formData();
    
    // สร้าง FormData ใหม่เพื่อแปลง subCategories จาก JSON string เป็น array
    const formData = new FormData();
    
    // เพิ่ม uid ใน FormData
    if (uid) {
      formData.append("uid", uid);
    }
    
    // คัดลอกทุก field จาก incomingFormData
    for (const [key, value] of incomingFormData.entries()) {
      if (key === "subCategories") {
        // แปลง subCategories จาก JSON string เป็น array
        if (typeof value === "string") {
          try {
            const subCategoriesArray = JSON.parse(value);
            // แปลงแต่ละรายการจาก { title, items } หรือ { category, options } เป็น { category, options }
            const transformedArray = subCategoriesArray.map((item: any) => {
              // ถ้ามี title และ items แปลงเป็น category และ options
              if (item.title && item.items) {
                return {
                  category: item.title,
                  options: item.items,
                };
              }
              // ถ้ามี category และ options อยู่แล้ว ให้ใช้ตามเดิม
              if (item.category && item.options) {
                return {
                  category: item.category,
                  options: item.options,
                };
              }
              // ถ้าไม่มีทั้งสองแบบ ให้ส่งไปตามเดิม
              return item;
            });
            
            // ตรวจสอบว่าแต่ละ item มี category และ options
            const validArray = transformedArray.filter((item: any) => {
              const isValid = item.category && Array.isArray(item.options);
              if (!isValid) {
                console.warn("Invalid subCategory item:", item);
              }
              return isValid;
            });
            
            // ส่ง subCategories เป็น JSON string เดียวที่มี array ของ object ที่มี category และ options
            // รูปแบบ: [{"category":"ขนาด","options":["พิเศษ","ธรรมดา"]}, {"category":"เนื้อสัตว์","options":["หมู","ไก่"]}]
            formData.append("subCategories", JSON.stringify(validArray));
            
            console.log("Sending subCategories as JSON string:", JSON.stringify(validArray));
          } catch (e) {
            // ถ้า parse ไม่ได้ ให้ส่งไปตามเดิม
            console.warn("Failed to parse subCategories:", e);
            formData.append(key, value);
          }
        } else {
          formData.append(key, value);
        }
      } else {
        formData.append(key, value);
      }
    }
    
    const r = await fetch(`${BASE}${finalPath}`, {
      method,
      headers,
      body: formData,
    });
    
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
    console.error(`Error ${method} FormData ${path}:`, error);
    return NextResponse.json(
      { success: false, message: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") ?? "";
  const categoryId = req.nextUrl.searchParams.get("categoryId") ?? "";
  
  const contentType = req.headers.get("content-type") || "";
  
  // ถ้าเป็น FormData (มี multipart/form-data)
  if (contentType.includes("multipart/form-data")) {
    const queryParams = new URLSearchParams();
    if (action) queryParams.set("action", action);
    if (categoryId) queryParams.set("categoryId", categoryId);
    
    const queryString = queryParams.toString();
    const path = `/api/menu${queryString ? `?${queryString}` : ""}`;
    
    if (action === "item" && categoryId) {
      return proxyFormData(req, path, "POST");
    }
  }
  
  // ถ้าเป็น JSON
  let bodyData: unknown;
  try {
    bodyData = await req.json();
  } catch {
    bodyData = undefined;
  }
  
  // สร้าง query string สำหรับ Express backend
  const queryParams = new URLSearchParams();
  if (action) queryParams.set("action", action);
  if (categoryId) queryParams.set("categoryId", categoryId);
  const uid = await getUidFromSession(req);
  if (uid) queryParams.set("uid", uid);
  
  const queryString = queryParams.toString();
  const path = `/api/menu${queryString ? `?${queryString}` : ""}`;
  
  if (action === "category" || action === "item") {
    return proxyRequest(req, path, "POST", bodyData, true);
  }
  
  return NextResponse.json({ error: "unknown_action" }, { status: 404 });
}

export async function PUT(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") ?? "";
  const categoryId = req.nextUrl.searchParams.get("categoryId") ?? "";
  const itemId = req.nextUrl.searchParams.get("itemId") ?? "";
  
  const contentType = req.headers.get("content-type") || "";
  
  // ถ้าเป็น FormData (มี multipart/form-data)
  if (contentType.includes("multipart/form-data")) {
    const queryParams = new URLSearchParams();
    if (action) queryParams.set("action", action);
    if (categoryId) queryParams.set("categoryId", categoryId);
    if (itemId) queryParams.set("itemId", itemId);
    
    const queryString = queryParams.toString();
    const path = `/api/menu${queryString ? `?${queryString}` : ""}`;
    
    if (action === "item" && categoryId && itemId) {
      return proxyFormData(req, path, "PUT");
    }
  }
  
  // ถ้าเป็น JSON
  let bodyData: unknown;
  try {
    bodyData = await req.json();
  } catch {
    bodyData = undefined;
  }
  
  // สร้าง query string สำหรับ Express backend
  const queryParams = new URLSearchParams();
  if (action) queryParams.set("action", action);
  if (categoryId) queryParams.set("categoryId", categoryId);
  if (itemId) queryParams.set("itemId", itemId);
  const uid = await getUidFromSession(req);
  if (uid) queryParams.set("uid", uid);
  
  const queryString = queryParams.toString();
  const path = `/api/menu${queryString ? `?${queryString}` : ""}`;
  
  if ((action === "category" && categoryId) || (action === "item" && categoryId && itemId)) {
    return proxyRequest(req, path, "PUT", bodyData, true);
  }
  
  return NextResponse.json({ error: "unknown_action" }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") ?? "";
  const categoryId = req.nextUrl.searchParams.get("categoryId") ?? "";
  const itemId = req.nextUrl.searchParams.get("itemId") ?? "";
  
  // สร้าง query string สำหรับ Express backend
  const queryParams = new URLSearchParams();
  if (action) queryParams.set("action", action);
  if (categoryId) queryParams.set("categoryId", categoryId);
  if (itemId) queryParams.set("itemId", itemId);
  const uid = await getUidFromSession(req);
  if (uid) queryParams.set("uid", uid);
  
  const queryString = queryParams.toString();
  const path = `/api/menu${queryString ? `?${queryString}` : ""}`;
  
  if ((action === "category" && categoryId) || (action === "item" && categoryId && itemId)) {
    return proxyRequest(req, path, "DELETE", undefined, false);
  }
  
  return NextResponse.json({ error: "unknown_action" }, { status: 404 });
}

