"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import {
  getMenuCategories,
  createMenuItem,
  type MenuCategory,
  type SubCategoryGroup,
  MenuError,
} from "@/lib/menuClient";
import Swal from "sweetalert2";
import { Plus, X, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AddMenuPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // States for item form
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemSubCategories, setItemSubCategories] = useState<SubCategoryGroup[]>([]);
  const [newSubCategoryTitle, setNewSubCategoryTitle] = useState("");
  const [newSubCategoryItems, setNewSubCategoryItems] = useState<Record<number, { name: string; price: string; priceType: "+" | "-" }>>({});
  const [editingSubCategoryIndex, setEditingSubCategoryIndex] = useState<number | null>(null);
  const [itemPrice, setItemPrice] = useState<string>("");
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(null);
  const [itemImageUrl, setItemImageUrl] = useState("");

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

  // Image handlers
  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      if (itemImagePreview) URL.revokeObjectURL(itemImagePreview);
      setItemImageFile(null);
      setItemImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    if (itemImagePreview) URL.revokeObjectURL(itemImagePreview);
    setItemImageFile(file);
    setItemImagePreview(url);
  }

  function onRemoveImage() {
    if (itemImagePreview) URL.revokeObjectURL(itemImagePreview);
    setItemImageFile(null);
    setItemImagePreview(null);
  }

  // SubCategory handlers
  const addSubCategoryGroup = () => {
    if (!newSubCategoryTitle.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุหัวข้อหมวดหมู่ย่อย",
      });
      return;
    }
    
    if (editingSubCategoryIndex !== null) {
      // แก้ไขกลุ่มที่มีอยู่
      const updated = [...itemSubCategories];
      updated[editingSubCategoryIndex] = {
        title: newSubCategoryTitle.trim(),
        items: updated[editingSubCategoryIndex].items,
      };
      setItemSubCategories(updated);
      setEditingSubCategoryIndex(null);
    } else {
      // เพิ่มกลุ่มใหม่
      setItemSubCategories([
        ...itemSubCategories,
        {
          title: newSubCategoryTitle.trim(),
          items: [],
        },
      ]);
    }
    setNewSubCategoryTitle("");
  };

  const addItemToSubCategory = (index: number) => {
    const itemData = newSubCategoryItems[index];
    const itemName = itemData?.name?.trim() || "";
    if (!itemName) return;
    
    const updated = [...itemSubCategories];
    let priceValue = itemData?.price?.trim() || undefined;
    const priceType = itemData?.priceType || "+";
    
    // ถ้ามี price แต่ไม่มี + หรือ - ให้เพิ่ม priceType เข้าไป
    if (priceValue && priceValue !== "" && !priceValue.startsWith("+") && !priceValue.startsWith("-")) {
      priceValue = `${priceType}${priceValue}`;
    }
    // ถ้าไม่มี price แต่มี priceType ให้ใช้ priceType กับ 0
    else if (!priceValue || priceValue === "") {
      priceValue = undefined;
    }
    
    const newItem = { name: itemName, price: priceValue };
    
    // ตรวจสอบว่ามี item นี้อยู่แล้วหรือไม่ (เช็คจาก name)
    if (!updated[index].items.some(item => item.name === itemName)) {
      updated[index].items.push(newItem);
      setItemSubCategories(updated);
    }
    setNewSubCategoryItems((prev) => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  const removeSubCategoryGroup = (index: number) => {
    setItemSubCategories(itemSubCategories.filter((_, i) => i !== index));
    // ลบ state ของ input ที่เกี่ยวข้องกับกลุ่มที่ถูกลบ
    setNewSubCategoryItems((prev) => {
      const newState: Record<number, { name: string; price: string; priceType: "+" | "-" }> = {};
      Object.keys(prev).forEach((key) => {
        const keyNum = parseInt(key);
        if (keyNum < index) {
          newState[keyNum] = prev[keyNum];
        } else if (keyNum > index) {
          newState[keyNum - 1] = prev[keyNum];
        }
      });
      return newState;
    });
  };

  const removeItemFromSubCategory = (groupIndex: number, itemIndex: number) => {
    const updated = [...itemSubCategories];
    updated[groupIndex].items.splice(itemIndex, 1);
    setItemSubCategories(updated);
  };

  const editSubCategoryGroup = (index: number) => {
    setEditingSubCategoryIndex(index);
    setNewSubCategoryTitle(itemSubCategories[index].title);
  };

  const handleCreateItem = async () => {
    if (!itemName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุชื่อเมนู",
      });
      return;
    }

    if (!itemDescription.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุคำอธิบายเมนู",
      });
      return;
    }

    if (!selectedCategoryId) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกหมวดหมู่",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await createMenuItem(selectedCategoryId, {
        name: itemName.trim(),
        description: itemDescription.trim(),
        subCategories: itemSubCategories,
        price: itemPrice ? parseFloat(itemPrice) : undefined,
        imageFile: itemImageFile || undefined,
        imageUrl: itemImageUrl.trim() || undefined,
      });

      if (response.success) {
        // Reset form
        setItemName("");
        setItemDescription("");
        setItemSubCategories([]);
        setNewSubCategoryTitle("");
        setNewSubCategoryItems({});
        setEditingSubCategoryIndex(null);
        setItemPrice("");
        setItemImageFile(null);
        if (itemImagePreview) URL.revokeObjectURL(itemImagePreview);
        setItemImagePreview(null);
        setItemImageUrl("");
        setSelectedCategoryId("");
        
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: response.message || "เพิ่มเมนูสำเร็จ",
          confirmButtonText: "เพิ่มเมนูอีก",
          showCancelButton: true,
          cancelButtonText: "กลับไปหน้าเมนู",
        }).then((result) => {
          if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
            router.push("/menu");
          }
        });
      }
    } catch (error) {
      console.error("Error creating item:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error instanceof MenuError ? error.message : "ไม่สามารถเพิ่มเมนูได้",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/menu">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">เพิ่มเมนูอาหาร</h1>
            <p className="text-sm text-zinc-500">
              สร้างหมวดหมู่และเพิ่มเมนูอาหารใหม่
            </p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card ซ้าย: เพิ่มรูปภาพ */}
          <Card>
            <CardHeader>
              <CardTitle>รูปภาพเมนู</CardTitle>
              <CardDescription>
                อัปโหลดรูปภาพเมนูอาหาร
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="itemImage">รูปภาพเมนู</Label>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-full aspect-video overflow-hidden rounded-lg border bg-white">
                    {itemImagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={itemImagePreview}
                        alt="menu-preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-sm text-zinc-400">
                        ไม่มีรูปภาพ
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <Input
                      id="itemImage"
                      type="file"
                      accept="image/*"
                      onChange={onPickImage}
                      disabled={loading}
                    />
                    {itemImagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onRemoveImage}
                        className="w-full"
                        disabled={loading}
                      >
                        ลบรูปภาพ
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="itemImageUrl">หรือใส่ URL รูปภาพ</Label>
                <Input
                  id="itemImageUrl"
                  value={itemImageUrl}
                  onChange={(e) => setItemImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card ขวา: ข้อมูลข้อความ */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลเมนู</CardTitle>
              <CardDescription>
                กรอกข้อมูลเมนูอาหาร
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="selectedCategory">เลือกหมวดหมู่ *</Label>
                <select
                  id="selectedCategory"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={loading || fetching}
                >
                  <option value="">-- เลือกหมวดหมู่ --</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && !fetching && (
                  <p className="text-xs text-zinc-500">
                    ยังไม่มีหมวดหมู่ กรุณาสร้างหมวดหมู่ก่อน
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemName">ชื่อเมนู *</Label>
                <Input
                  id="itemName"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="เช่น ข้าวผัดกุ้ง"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemDescription">คำอธิบาย *</Label>
                <Textarea
                  id="itemDescription"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="อธิบายรายละเอียดเมนู"
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemPrice">ราคา</Label>
                <Input
                  id="itemPrice"
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="เช่น 120"
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>หมวดหมู่ย่อย</Label>
                
                {/* เพิ่ม/แก้ไขหัวข้อหมวดหมู่ย่อย */}
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newSubCategoryTitle}
                    onChange={(e) => setNewSubCategoryTitle(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubCategoryGroup();
                      }
                    }}
                    placeholder={editingSubCategoryIndex !== null ? "แก้ไขหัวข้อ" : "หัวข้อหมวดหมู่ (เช่น ขนาด, เนื้อสัตว์)"}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addSubCategoryGroup}
                    variant="outline"
                    disabled={loading || !newSubCategoryTitle.trim()}
                  >
                    {editingSubCategoryIndex !== null ? "บันทึก" : <Plus className="h-4 w-4" />}
                  </Button>
                  {editingSubCategoryIndex !== null && (
                    <Button
                      type="button"
                      onClick={() => {
                        setEditingSubCategoryIndex(null);
                        setNewSubCategoryTitle("");
                      }}
                      variant="outline"
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* แสดงหมวดหมู่ย่อยทั้งหมด */}
                <div className="space-y-3">
                  {itemSubCategories.map((group, groupIndex) => (
                    <div key={groupIndex} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{group.title}</h4>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => editSubCategoryGroup(groupIndex)}
                            disabled={loading}
                            className="h-6 px-2"
                          >
                            แก้ไข
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeSubCategoryGroup(groupIndex)}
                            disabled={loading}
                            className="h-6 px-2 text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newSubCategoryItems[groupIndex]?.name || ""}
                          onChange={(e) => {
                            setNewSubCategoryItems((prev) => ({
                              ...prev,
                              [groupIndex]: {
                                name: e.target.value,
                                price: prev[groupIndex]?.price || "",
                                priceType: prev[groupIndex]?.priceType || "+",
                              },
                            }));
                          }}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addItemToSubCategory(groupIndex);
                            }
                          }}
                          placeholder="ชื่อรายการ (เช่น พิเศษ, ธรรมดา)"
                          disabled={loading}
                          className="flex-1"
                        />
                        <select
                          value={newSubCategoryItems[groupIndex]?.priceType || "+"}
                          onChange={(e) => {
                            setNewSubCategoryItems((prev) => ({
                              ...prev,
                              [groupIndex]: {
                                name: prev[groupIndex]?.name || "",
                                price: prev[groupIndex]?.price || "",
                                priceType: e.target.value as "+" | "-",
                              },
                            }));
                          }}
                          disabled={loading}
                          className="w-16 rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </select>
                        <Input
                          type="text"
                          value={newSubCategoryItems[groupIndex]?.price || ""}
                          onChange={(e) => {
                            // ลบ + หรือ - ออกถ้ามี แล้วให้ใช้ priceType แทน
                            let priceValue = e.target.value.replace(/^[+-]/, "");
                            setNewSubCategoryItems((prev) => ({
                              ...prev,
                              [groupIndex]: {
                                name: prev[groupIndex]?.name || "",
                                price: priceValue,
                                priceType: prev[groupIndex]?.priceType || "+",
                              },
                            }));
                          }}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addItemToSubCategory(groupIndex);
                            }
                          }}
                          placeholder="ราคา"
                          disabled={loading}
                          className="w-24"
                        />
                        <Button
                          type="button"
                          onClick={() => addItemToSubCategory(groupIndex)}
                          variant="outline"
                          disabled={loading || !(newSubCategoryItems[groupIndex]?.name?.trim())}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((item, itemIndex) => (
                          <span
                            key={itemIndex}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-hover/20 text-primary-hover rounded-md text-sm"
                          >
                            {item.name}
                            {item.price !== undefined && item.price !== null && item.price.trim() !== "" && (
                              <span className={`text-xs ${item.price.startsWith("-") ? "text-red-600" : "text-zinc-600"}`}>
                                ({item.price} บาท)
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeItemFromSubCategory(groupIndex, itemIndex)}
                              className="hover:text-red-600"
                              disabled={loading}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateItem}
                  disabled={loading || !selectedCategoryId}
                  className="flex-1"
                >
                  {loading ? "กำลังเพิ่ม..." : "เพิ่มเมนู"}
                </Button>
                <Link href="/menu">
                  <Button variant="outline" disabled={loading}>
                    ยกเลิก
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

