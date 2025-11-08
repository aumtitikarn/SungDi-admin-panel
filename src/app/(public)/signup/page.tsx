"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useState } from "react";
import AuthCard from "@/components/auth/AuthCard";
import TextField from "@/components/auth/TextField";
import PasswordField from "@/components/auth/PasswordField";
import {
  HttpError,
  register as apiRegister,
  login as apiLogin,
} from "@/lib/authClient";

function isEmail(v: string) {
  return /.+@.+\..+/.test(v);
}

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirm?: string;
    form?: string;
  }>({});

  function validate() {
    const next: typeof errors = {};
    if (!displayName) next.displayName = "กรอกชื่อที่แสดง";
    if (!email) next.email = "กรอกอีเมล";
    else if (!isEmail(email)) next.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (!password) next.password = "กรอกรหัสผ่าน";
    if (confirm !== password) next.confirm = "รหัสผ่านไม่ตรงกัน";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      await apiRegister({ displayName, email, password });
      await apiLogin({ email, password });
      router.push("/");
    } catch (err: unknown) {
      let msg = "สมัครสมาชิกไม่สำเร็จ";
      if (err instanceof HttpError) {
        if (err.status === 409 || err.code === "EMAIL_EXISTS")
          msg = "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น";
        else if (err.code === "INVALID_EMAIL") msg = "รูปแบบอีเมลไม่ถูกต้อง";
        else if (err.code === "WEAK_PASSWORD")
          msg = "รหัสผ่านควรมีอย่างน้อย 6 ตัวอักษร";
        else msg = err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-white">
      <form onSubmit={onSubmit}>
        <AuthCard title="สมัครสมาชิก" subtitle="เริ่มใช้งานระบบ POS ของคุณ">
          {errors.form && (
            <div className="mb-3 rounded-xl bg-red-50 text-red-700 px-3 py-2 text-sm">
              {errors.form}
            </div>
          )}

          <TextField
            label="ชื่อร้านค้า"
            placeholder="ชื่อร้านค้า"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={errors.displayName}
            className="mb-3"
          />
          <TextField
            label="อีเมล"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            className="mb-3"
          />
          <PasswordField
            label="รหัสผ่าน"
            placeholder="อย่างน้อย 6 ตัวอักษร"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            className="mb-3"
          />
          <PasswordField
            label="ยืนยันรหัสผ่าน"
            placeholder="พิมพ์ซ้ำอีกครั้ง"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
            className="mb-4"
          />

          <button
            className="w-full rounded-xl px-4 py-2 font-medium text-white bg-[#faa500] hover:opacity-90 active:opacity-80 transition"
            disabled={loading}
          >
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>

          <p className="mt-4 text-sm text-center text-gray-600">
            มีบัญชีแล้ว?{" "}
            <Link href="/login" className="text-[#faa500] underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </AuthCard>
      </form>
    </main>
  );
}
