// src/lib/menuClient.ts

export type SubCategoryItem = {
  name: string;
  price?: string; // รับค่าเป็น string ที่มี + หรือ - เช่น "+50", "-20", "100"
};

export type SubCategoryGroup = {
  title: string;
  items: SubCategoryItem[];
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  subCategories: SubCategoryGroup[]; // เช่น [{ title: "ขนาด", items: ["พิเศษ", "ธรรมดา"] }, { title: "เนื้อสัตว์", items: ["หมู", "ไก่"] }]
  price?: number | null;
  imageUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MenuCategory = {
  id: string;
  name: string;
  items: MenuItem[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MenuResponse = {
  success: boolean;
  data: MenuCategory[];
  count: number;
  message?: string;
};

export type CategoryResponse = {
  success: boolean;
  data: MenuCategory;
  message?: string;
};

export type ItemResponse = {
  success: boolean;
  data: MenuItem;
  message?: string;
};

export class MenuError extends Error {
  status: number;
  code?: string;
  payload?: unknown;
  
  constructor(opts: { message: string; status: number; code?: string; payload?: unknown }) {
    super(opts.message);
    this.name = "MenuError";
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
    throw new MenuError({
      message: pickMessage(payload),
      status: res.status,
      payload,
    });
  }
  
  return (payload ?? ({} as T)) as T;
}

// ดึงหมวดหมู่ทั้งหมดพร้อมเมนู
export async function getMenuCategories(): Promise<MenuResponse> {
  const response = await json<MenuResponse>("/api/menu");
  
  // แปลง subCategories จาก { category, options } เป็น { title, items }
  if (response.success && response.data) {
    response.data = response.data.map((category) => ({
      ...category,
      items: category.items.map((item) => ({
        ...item,
        subCategories: item.subCategories?.map((subCat: any) => {
          // ถ้ามี category และ options แปลงเป็น title และ items
          if (subCat.category && subCat.options) {
            return {
              title: subCat.category,
              items: subCat.options.map((opt: any) => {
                // ถ้า options เป็น object ที่มี name และ price
                if (typeof opt === "object" && opt !== null && "name" in opt) {
                  // แปลง price เป็น string
                  const priceStr = opt.price !== undefined && opt.price !== null 
                    ? String(opt.price)
                    : undefined;
                  return { name: opt.name, price: priceStr };
                }
                // ถ้า options เป็น string (backward compatible)
                if (typeof opt === "string") {
                  return { name: opt };
                }
                return opt;
              }),
            };
          }
          // ถ้ามี title และ items อยู่แล้ว ให้แปลง items ให้รองรับ price
          if (subCat.title && subCat.items) {
            return {
              title: subCat.title,
              items: subCat.items.map((item: any) => {
                // ถ้า items เป็น object ที่มี name และ price
                if (typeof item === "object" && item !== null && "name" in item) {
                  // แปลง price เป็น string
                  const priceStr = item.price !== undefined && item.price !== null
                    ? String(item.price)
                    : undefined;
                  return { name: item.name, price: priceStr };
                }
                // ถ้า items เป็น string (backward compatible)
                if (typeof item === "string") {
                  return { name: item };
                }
                return item;
              }),
            };
          }
          // ถ้าไม่มีทั้งสองแบบ ให้ส่งไปตามเดิม
          return subCat;
        }) || [],
      })),
    }));
  }
  
  return response;
}

// สร้างหมวดหมู่ใหม่
export async function createCategory(name: string): Promise<CategoryResponse> {
  return json<CategoryResponse>("/api/menu?action=category", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// แก้ไขชื่อหมวดหมู่
export async function updateCategory(categoryId: string, name: string): Promise<{ success: boolean; message: string }> {
  return json<{ success: boolean; message: string }>(
    `/api/menu?action=category&categoryId=${encodeURIComponent(categoryId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ name }),
    }
  );
}

// ลบหมวดหมู่
export async function deleteCategory(categoryId: string): Promise<{ success: boolean; message: string }> {
  return json<{ success: boolean; message: string }>(
    `/api/menu?action=category&categoryId=${encodeURIComponent(categoryId)}`,
    {
      method: "DELETE",
    }
  );
}

async function formDataRequest<T>(path: string, formData: FormData, method: string = "POST"): Promise<T> {
  const res = await fetch(path, {
    method,
    body: formData,
    credentials: "include",
  });
  
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    payload = undefined;
  }
  
  if (!res.ok) {
    throw new MenuError({
      message: pickMessage(payload),
      status: res.status,
      payload,
    });
  }
  
  return (payload ?? ({} as T)) as T;
}

// เพิ่มเมนูในหมวดหมู่
export async function createMenuItem(
  categoryId: string,
  data: {
    name: string;
    description: string;
    subCategories: SubCategoryGroup[];
    price?: number;
    imageFile?: File;
    imageUrl?: string;
  }
): Promise<ItemResponse> {
  // Validate required fields
  const trimmedName = data.name?.trim() || "";
  const trimmedDescription = data.description?.trim() || "";
  
  if (!trimmedName) {
    throw new MenuError({
      message: "กรุณาระบุชื่อเมนู",
      status: 400,
    });
  }
  
  if (!trimmedDescription) {
    throw new MenuError({
      message: "กรุณาระบุคำอธิบายเมนู",
      status: 400,
    });
  }
  
  // แปลง subCategories จาก { title, items } เป็น { category, options }
  // items เป็น array ของ { name, price? } ให้แปลงเป็น array ของ { name, price? } หรือ string (backward compatible)
  const transformedSubCategories = data.subCategories.map((group) => ({
    category: group.title,
    options: group.items.map((item) => {
      // ถ้ามี price ให้ส่งเป็น object (price เป็น string ที่มี + หรือ -)
      if (item.price !== undefined && item.price !== null && item.price.trim() !== "") {
        return { name: item.name, price: item.price };
      }
      // ถ้าไม่มี price ให้ส่งเป็น string (backward compatible)
      return item.name;
    }),
  }));

  // ถ้ามีไฟล์รูปภาพ ให้ใช้ FormData
  if (data.imageFile) {
    const formData = new FormData();
    formData.append("name", trimmedName);
    formData.append("description", trimmedDescription);
    formData.append("subCategories", JSON.stringify(transformedSubCategories));
    if (data.price !== undefined) {
      formData.append("price", data.price.toString());
    }
    formData.append("image", data.imageFile);
    
    return formDataRequest<ItemResponse>(
      `/api/menu?action=item&categoryId=${encodeURIComponent(categoryId)}`,
      formData
    );
  }
  
  // ไม่มีไฟล์ ให้ใช้ JSON
  return json<ItemResponse>(
    `/api/menu?action=item&categoryId=${encodeURIComponent(categoryId)}`,
    {
      method: "POST",
      body: JSON.stringify({
        name: trimmedName,
        description: trimmedDescription,
        subCategories: transformedSubCategories,
        price: data.price,
        imageUrl: data.imageUrl,
      }),
    }
  );
}

// แก้ไขเมนู
export async function updateMenuItem(
  categoryId: string,
  itemId: string,
  data: {
    name: string;
    description: string;
    subCategories: SubCategoryGroup[];
    price?: number;
    imageFile?: File;
    imageUrl?: string;
  }
): Promise<{ success: boolean; message: string }> {
  // แปลง subCategories จาก { title, items } เป็น { category, options }
  // items เป็น array ของ { name, price? } ให้แปลงเป็น array ของ { name, price? } หรือ string (backward compatible)
  const transformedSubCategories = data.subCategories.map((group) => ({
    category: group.title,
    options: group.items.map((item) => {
      // ถ้ามี price ให้ส่งเป็น object (price เป็น string ที่มี + หรือ -)
      if (item.price !== undefined && item.price !== null && item.price.trim() !== "") {
        return { name: item.name, price: item.price };
      }
      // ถ้าไม่มี price ให้ส่งเป็น string (backward compatible)
      return item.name;
    }),
  }));

  // ถ้ามีไฟล์รูปภาพ ให้ใช้ FormData
  if (data.imageFile) {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("subCategories", JSON.stringify(transformedSubCategories));
    if (data.price !== undefined) {
      formData.append("price", data.price.toString());
    }
    formData.append("image", data.imageFile);
    
    return formDataRequest<{ success: boolean; message: string }>(
      `/api/menu?action=item&categoryId=${encodeURIComponent(categoryId)}&itemId=${encodeURIComponent(itemId)}`,
      formData,
      "PUT"
    );
  }
  
  // ไม่มีไฟล์ ให้ใช้ JSON
  return json<{ success: boolean; message: string }>(
    `/api/menu?action=item&categoryId=${encodeURIComponent(categoryId)}&itemId=${encodeURIComponent(itemId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        subCategories: transformedSubCategories,
        price: data.price,
        imageUrl: data.imageUrl,
      }),
    }
  );
}

// ลบเมนู
export async function deleteMenuItem(
  categoryId: string,
  itemId: string
): Promise<{ success: boolean; message: string }> {
  return json<{ success: boolean; message: string }>(
    `/api/menu?action=item&categoryId=${encodeURIComponent(categoryId)}&itemId=${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
    }
  );
}

