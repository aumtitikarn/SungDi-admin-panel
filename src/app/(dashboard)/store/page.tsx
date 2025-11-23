"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getProfile, saveStore } from "@/lib/storeClient";
import Swal from "sweetalert2";
import { updateAuthen } from "@/lib/storeClient";

type PersonalForm = {
  firstName: string | null;
  lastName: string | null;
  citizenId: string | null;
  phone: string | null;
  birthday: string | null; // ISO (yyyy-mm-dd)
};

type StoreForm = {
  shopName: string;
  description: string;
  address: string;
  imageFile: File | null;
  imagePreview: string | null;
  storeNumberPhone: string;
  storeFacebook: string | null;
  storeLine: string | null;
};

type SessionUser = { id?: string; uid?: string };

type ApiPersonalDoc = {
  uid: string;
  email: string;
  numberphone: string;
  firstName?: string;
  lastName?: string;
  citizenId?: string;
  phone?: string;
  birthday?: string;
  password?: string;
  createdAt?: unknown;
};

type ApiShopDoc = {
  uid: string;
  shopName: string | null;
  description: string | null;
  address: string | null;
  storeNumberPhone: string | null;
  storeFacebook?: string | null;
  storeLine?: string | null;
  logoPath?: string | null;
  logoUrl?: string | null;
  updatedAt?: unknown | null;
};

type ProfileResponse = {
  personal: ApiPersonalDoc | null;
  store: ApiShopDoc | null;
};

export default function StorePage() {
  const { data: session } = useSession();
  //   console.log("session", session);
  const uid = (() => {
    const u = session?.user as SessionUser | undefined;
    return u?.uid ?? u?.id ?? "";
  })();
  // ---------- state ----------
  const [personal, setPersonal] = useState<PersonalForm>({
    firstName: "",
    lastName: "",
    citizenId: "",
    phone: "",
    birthday: "",
  });

  const [store, setStore] = useState<StoreForm>({
    shopName: "",
    description: "",
    address: "",
    imageFile: null,
    imagePreview: null,
    storeNumberPhone: "",
    storeFacebook: null,
    storeLine: null,
  });
  const [canEditCredentials, setCanEditCredentials] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");

  // ---------- handlers ----------
  function onPersonalChange<K extends keyof PersonalForm>(
    key: K,
    val: PersonalForm[K]
  ) {
    setPersonal((p) => ({ ...p, [key]: val }));
  }
  function onStoreChange<K extends keyof StoreForm>(key: K, val: StoreForm[K]) {
    setStore((s) => ({ ...s, [key]: val }));
  }

  function pruneEmpty<T extends Record<string, any>>(obj: T) {
    const out: Record<string, any> = {};
    Object.entries(obj).forEach(([k, v]) => {
      if (v === undefined) return;
      if (v === null) return; // ถ้าอยาก "ล้างค่า" เป็น null ให้ทำปุ่ม clear แยก แล้วส่ง null ด้วยเจตนา
      if (typeof v === "string" && v.trim() === "") return;
      out[k] = v;
    });
    return out as Partial<T>;
  }

  function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      if (store.imagePreview) URL.revokeObjectURL(store.imagePreview);
      onStoreChange("imageFile", null);
      onStoreChange("imagePreview", null);
      return;
    }
    const url = URL.createObjectURL(file);
    if (store.imagePreview) URL.revokeObjectURL(store.imagePreview);
    onStoreChange("imageFile", file);
    onStoreChange("imagePreview", url);
  }

  function onRemoveImage() {
    if (store.imagePreview) URL.revokeObjectURL(store.imagePreview);
    onStoreChange("imageFile", null);
    onStoreChange("imagePreview", null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!uid) {
      await Swal.fire({
        icon: "warning",
        title: "ไม่พบผู้ใช้",
        text: "กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล",
        confirmButtonText: "ตกลง",
      });
      return;
    }
    try {
      setSaving(true);
      Swal.fire({
        title: "กำลังบันทึก...",
        text: "กรุณารอสักครู่",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // ส่งเฉพาะฟิลด์ที่ "มีค่า" เท่านั้น (ว่าง = ไม่ส่ง = ไม่ overwrite)
      const personalPartial = pruneEmpty({
        firstName: personal.firstName ?? undefined,
        lastName: personal.lastName ?? undefined,
        citizenId: personal.citizenId ?? undefined,
        phone: personal.phone ?? undefined,
        birthday: personal.birthday ?? undefined,
      });

      const storePartial = pruneEmpty({
        shopName: store.shopName ?? undefined,
        description: store.description ?? undefined,
        address: store.address ?? undefined,
        storeNumberPhone: store.storeNumberPhone ?? undefined,
        storeFacebook: store.storeFacebook ?? undefined,
        storeLine: store.storeLine ?? undefined,
      });

      await saveStore(uid, personalPartial, {
        ...storePartial,
        imageFile: store.imageFile,
      });

      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ!",
        text: "ข้อมูลร้านค้าของคุณถูกอัปเดตแล้ว",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "ตกลง",
      });

      await loadInitial();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(err);
      alert(message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  // ---------- load initial profile ----------
  const loadInitial = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const data: ProfileResponse = await getProfile(uid);

      // ดึงข้อมูล personal จาก array (ถ้ามี)
      const pAny: any = data.personal ?? null;
      const pFromArray =
        Array.isArray((pAny as any)?.personal) && (pAny as any).personal[0]
          ? (pAny as any).personal[0]
          : undefined;

      const firstName = pAny?.firstName ?? pFromArray?.firstName ?? "";
      const lastName = pAny?.lastName ?? pFromArray?.lastName ?? "";
      const phone = pAny?.numberphone ?? pFromArray?.phone ?? "";
      const citizenId = pAny?.citizenId ?? pFromArray?.phone ?? "";
      const birthday = pAny?.birthday ?? pFromArray?.phone ?? "";
      const email = pAny?.email ?? pFromArray?.email ?? "";
      setEmail(email);
      setPersonal({
        firstName,
        lastName,
        citizenId,
        phone,
        birthday
      });

      const s = data.store;
      setStore((prev) => ({
        shopName: s?.shopName ?? "",
        description: s?.description ?? "",
        address: s?.address ?? "",
        imageFile: null,
        imagePreview: s?.logoUrl ?? null,
        storeNumberPhone: s?.storeNumberPhone ?? "",
        storeFacebook: s?.storeFacebook ?? null,
        storeLine: s?.storeLine ?? null,
      }));

      setCanEditCredentials(false);
    } catch (err) {
      console.warn("no existing profile or fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  async function onChangeEmail() {
  if (!uid) {
    await Swal.fire({ icon: "warning", title: "ไม่พบผู้ใช้", text: "กรุณาเข้าสู่ระบบใหม่", confirmButtonText: "ตกลง" });
    return;
  }
  if (!newEmail.trim()) {
    await Swal.fire({ icon: "warning", title: "กรุณากรอกอีเมลใหม่", confirmButtonText: "ตกลง" });
    return;
  }
  try {
    Swal.fire({ title: "กำลังอัปเดตอีเมล...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    await updateAuthen(uid, { email: newEmail.trim() });
    await Swal.fire({ icon: "success", title: "อัปเดตอีเมลสำเร็จ", confirmButtonText: "ตกลง" });
    setEmail(newEmail.trim());
    setNewEmail("");
  } catch (err: any) {
    await Swal.fire({ icon: "error", title: "อัปเดตอีเมลไม่สำเร็จ", text: err?.message ?? "ลองใหม่อีกครั้ง", confirmButtonText: "ตกลง" });
  }
}

async function onChangePassword() {
  if (!uid) {
    await Swal.fire({ icon: "warning", title: "ไม่พบผู้ใช้", text: "กรุณาเข้าสู่ระบบใหม่", confirmButtonText: "ตกลง" });
    return;
  }
  if (!pwd1 || !pwd2) {
    await Swal.fire({ icon: "warning", title: "กรุณากรอกรหัสผ่านให้ครบ", confirmButtonText: "ตกลง" });
    return;
  }
  if (pwd1 !== pwd2) {
    await Swal.fire({ icon: "warning", title: "รหัสผ่านไม่ตรงกัน", text: "กรุณาพิมพ์รหัสผ่านเดิมอีกครั้งให้ตรงกัน", confirmButtonText: "ตกลง" });
    return;
  }
  try {
    Swal.fire({ title: "กำลังอัปเดตรหัสผ่าน...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    await updateAuthen(uid, { password: pwd1, confirmPassword: pwd2 });
    await Swal.fire({ icon: "success", title: "อัปเดตรหัสผ่านสำเร็จ", confirmButtonText: "ตกลง" });
    setPwd1("");
    setPwd2("");
  } catch (err: any) {
    await Swal.fire({ icon: "error", title: "อัปเดตรหัสผ่านไม่สำเร็จ", text: err?.message ?? "ลองใหม่อีกครั้ง", confirmButtonText: "ตกลง" });
  }
}


  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // ---------- ui ----------
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">จัดการร้านค้า</h1>
          <p className="text-sm text-zinc-500">
            {loading
              ? "กำลังโหลดข้อมูล..."
              : "อัปเดตข้อมูลผู้ใช้และข้อมูลร้านค้าของคุณ"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadInitial()}
            disabled={loading || saving}
          >
            รีเฟรช
          </Button>
          <Button
            type="submit"
            disabled={loading || saving}
            className="bg-primary-hover text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </div>
      </div>

      {/* two columns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลส่วนบุคคล</CardTitle>
            <CardDescription>
              กรอกข้อมูลพื้นฐานสำหรับผู้ดูแลระบบร้าน
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">ชื่อ</Label>
                <Input
                  id="firstName"
                  value={personal.firstName || ""}
                  onChange={(e) =>
                    onPersonalChange("firstName", e.target.value)
                  }
                  placeholder="ชื่อ"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">นามสกุล</Label>
                <Input
                  id="lastName"
                  value={personal.lastName || ""}
                  onChange={(e) => onPersonalChange("lastName", e.target.value)}
                  placeholder="นามสกุล"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="citizenId">เลขประจำตัวประชาชน</Label>
                <Input
                  id="citizenId"
                  inputMode="numeric"
                  maxLength={13}
                  value={personal.citizenId || ""}
                  onChange={(e) =>
                    onPersonalChange(
                      "citizenId",
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="เลขประจำตัวประชาชน 13 หลัก"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">เบอร์โทรศัพท์มือถือ</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={personal.phone || ""}
                  onChange={(e) =>
                    onPersonalChange(
                      "phone",
                      e.target.value.replace(/[^\d+]/g, "")
                    )
                  }
                  placeholder="เบอร์โทรศัพท์มือถือ"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="birthday">วันเกิด</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={personal.birthday || ""}
                  onChange={(e) => onPersonalChange("birthday", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currentEmail">อีเมลปัจจุบัน</Label>
              <Input
                id="currentEmail"
                type="email"
                value={email}
                disabled
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newEmail">อีเมลใหม่</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={!canEditCredentials}
                  className={
                    !canEditCredentials
                      ? "bg-gray-100 cursor-not-allowed opacity-70"
                      : ""
                  }
                />
                {!canEditCredentials ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCanEditCredentials(true)}
                  >
                    ต้องการเปลี่ยน
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setCanEditCredentials(false)}
                  >
                    ยกเลิก
                  </Button>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={onChangeEmail}
                  disabled={!canEditCredentials || saving}
                >
                  อัปเดตอีเมล
                </Button>
              </div>
            </div>

            {/* รหัสผ่าน + ยืนยันรหัสผ่าน */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pwd1">รหัสผ่านใหม่</Label>
                <Input
                  id="pwd1"
                  type="password"
                  value={pwd1}
                  onChange={(e) => setPwd1(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  disabled={!canEditCredentials}
                  className={
                    !canEditCredentials
                      ? "bg-gray-100 cursor-not-allowed opacity-70"
                      : ""
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd2">ยืนยันรหัสผ่าน</Label>
                <Input
                  id="pwd2"
                  type="password"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                  placeholder="พิมพ์รหัสผ่านเดิมอีกครั้ง"
                  disabled={!canEditCredentials}
                  className={
                    !canEditCredentials
                      ? "bg-gray-100 cursor-not-allowed opacity-70"
                      : ""
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={onChangePassword}
                disabled={!canEditCredentials || saving}
              >
                อัปเดตรหัสผ่าน
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Store */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลร้านค้า</CardTitle>
            <CardDescription>
              รายละเอียดของร้านสำหรับการจัดการ POS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image upload + preview */}
            <div className="space-y-2">
              <Label htmlFor="image">รูปภาพร้าน</Label>
              <div className="flex items-start gap-4">
                <div className="relative h-24 w-24 overflow-hidden rounded-lg border bg-white">
                  {store.imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={store.imagePreview}
                      alt="store-preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-zinc-400">
                      ไม่มีรูป
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={onPickImage}
                  />
                  {store.imagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onRemoveImage}
                      className="w-fit"
                    >
                      ลบรูปภาพ
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storeName">ชื่อร้าน</Label>
              <Input
                id="storeName"
                value={store.shopName}
                onChange={(e) => onStoreChange("shopName", e.target.value)}
                placeholder="ชื่อร้านของคุณ"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storeDesc">คำอธิบายร้านค้า</Label>
              <Textarea
                id="storeDesc"
                value={store.description}
                onChange={(e) => onStoreChange("description", e.target.value)}
                placeholder="บอกรายละเอียด จุดเด่น หรือบริการของร้าน"
                className="min-h-[96px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storeAddress">ที่อยู่</Label>
              <Textarea
                id="storeAddress"
                value={store.address}
                onChange={(e) => onStoreChange("address", e.target.value)}
                placeholder="ที่อยู่สำหรับออกบิล/ติดต่อ"
                className="min-h-[96px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storeContact">เบอร์ติดต่อร้านค้า</Label>
              <Input
                id="storeContact"
                value={store.storeNumberPhone}
                onChange={(e) =>
                  onStoreChange("storeNumberPhone", e.target.value)
                }
                placeholder="เบอร์ติดต่อร้านค้า"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storeFacebook">Facebook</Label>
              <Input
                id="storeFacebook"
                value={store.storeFacebook || ""}
                onChange={(e) => onStoreChange("storeFacebook", e.target.value)}
                placeholder="ชื่อ Facebook ร้านค้า"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storeLine">Line</Label>
              <Input
                id="storeLine"
                value={store.storeLine || ""}
                onChange={(e) => onStoreChange("storeLine", e.target.value)}
                placeholder="ไอดีไลน์ร้านค้า"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
