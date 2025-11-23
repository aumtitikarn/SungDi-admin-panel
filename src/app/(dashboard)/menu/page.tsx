"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getMenuCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteMenuItem,
  type MenuCategory,
  type MenuItem,
  MenuError,
} from "@/lib/menuClient";
import Swal from "sweetalert2";
import { Plus, Edit, Trash2, X, Check } from "lucide-react";
import Link from "next/link";

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // States for category form
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState(""); // สำหรับ Category Form Modal
  const [inlineCategoryName, setInlineCategoryName] = useState(""); // สำหรับ inline editing ในแต่ละ Card

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setFetching(true);
      const response = await getMenuCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error instanceof MenuError ? error.message : "ไม่สามารถดึงข้อมูลเมนูได้",
      });
    } finally {
      setFetching(false);
    }
  };

  // Category handlers
  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุชื่อหมวดหมู่",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await createCategory(categoryName.trim());
      if (response.success) {
        setCategoryName("");
        setShowCategoryForm(false);
        await fetchCategories();
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: response.message || "สร้างหมวดหมู่สำเร็จ",
        });
      }
    } catch (error) {
      console.error("Error creating category:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error instanceof MenuError ? error.message : "ไม่สามารถสร้างหมวดหมู่ได้",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (categoryId: string, name?: string) => {
    // ถ้ามี name มาจาก inline editing ใช้ name นั้น ไม่เช่นนั้นใช้ categoryName จาก form
    const nameToUpdate = name?.trim() || categoryName.trim();
    if (!nameToUpdate) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุชื่อหมวดหมู่",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await updateCategory(categoryId, nameToUpdate);
      if (response.success) {
        setCategoryName("");
        setInlineCategoryName("");
        setEditingCategory(null);
        await fetchCategories();
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: response.message || "แก้ไขหมวดหมู่สำเร็จ",
        });
      }
    } catch (error) {
      console.error("Error updating category:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error instanceof MenuError ? error.message : "ไม่สามารถแก้ไขหมวดหมู่ได้",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบ",
      html: `คุณต้องการลบหมวดหมู่ "<b>${categoryName}</b>" และเมนูทั้งหมดในหมวดหมู่นี้ใช่หรือไม่?<br/>การกระทำนี้ไม่สามารถยกเลิกได้`,
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      const response = await deleteCategory(categoryId);
      if (response.success) {
        await fetchCategories();
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: response.message || "ลบหมวดหมู่สำเร็จ",
        });
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error instanceof MenuError ? error.message : "ไม่สามารถลบหมวดหมู่ได้",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteItem = async (categoryId: string, itemId: string, itemName: string) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบ",
      text: `คุณต้องการลบเมนู "${itemName}" ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      const response = await deleteMenuItem(categoryId, itemId);
      if (response.success) {
        await fetchCategories();
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: response.message || "ลบเมนูสำเร็จ",
        });
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error instanceof MenuError ? error.message : "ไม่สามารถลบเมนูได้",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">จัดการเมนูอาหาร</h1>
          <p className="text-sm text-zinc-500">
            จัดการหมวดหมู่และเมนูอาหาร
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingCategory(null);
              setCategoryName("");
              setShowCategoryForm(true);
            }}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มหมวดหมู่
          </Button>
        </div>
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle>
              {editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">ชื่อหมวดหมู่</Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="เช่น อาหารจานหลัก, เครื่องดื่ม"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (editingCategory) {
                    handleUpdateCategory(editingCategory);
                  } else {
                    handleCreateCategory();
                  }
                }}
                disabled={loading}
              >
                {loading ? "กำลังบันทึก..." : editingCategory ? "บันทึก" : "สร้าง"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCategoryForm(false);
                  setEditingCategory(null);
                  setCategoryName("");
                }}
              >
                ยกเลิก
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      {fetching ? (
        <div className="flex items-center justify-center py-12 text-zinc-500">
          กำลังโหลดข้อมูล...
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-zinc-500 mb-4">ยังไม่มีหมวดหมู่เมนู</p>
            <Button
              onClick={() => {
                setEditingCategory(null);
                setCategoryName("");
                setShowCategoryForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มหมวดหมู่แรก
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {editingCategory === category.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={inlineCategoryName}
                          onChange={(e) => setInlineCategoryName(e.target.value)}
                          className="max-w-xs"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateCategory(category.id, inlineCategoryName)}
                          disabled={loading}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCategory(null);
                            setInlineCategoryName("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <CardTitle>{category.name}</CardTitle>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingCategory(category.id);
                        setInlineCategoryName(category.name);
                      }}
                      disabled={loading || editingCategory === category.id}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Link href="/menu/add">
                      <Button size="sm" disabled={loading}>
                        <Plus className="h-4 w-4 mr-1" />
                        เพิ่มเมนู
                      </Button>
                    </Link>
                  </div>
                </div>
                <CardDescription>
                  มีเมนูทั้งหมด {category.items.length} รายการ
                </CardDescription>
              </CardHeader>
              <CardContent>
                {category.items.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-sm text-zinc-500 border border-dashed rounded-lg">
                    ยังไม่มีเมนูในหมวดหมู่นี้
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {category.items.map((item) => (
                      <Card key={item.id} className="border">
                        <CardContent className="p-4">
                          {item.imageUrl && (
                            <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg bg-zinc-100">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold">{item.name}</h3>
                              {item.price && (
                                <span className="text-sm font-medium text-primary-hover">
                                  {item.price.toLocaleString()} บาท
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-zinc-600 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            <div className="flex gap-2 pt-2">
                              <Link
                                href={`/menu/edit?categoryId=${encodeURIComponent(category.id)}&itemId=${encodeURIComponent(item.id)}`}
                                className="flex-1"
                              >
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={loading}
                                  className="w-full"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  แก้ไข
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleDeleteItem(category.id, item.id, item.name)
                                }
                                disabled={loading}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

