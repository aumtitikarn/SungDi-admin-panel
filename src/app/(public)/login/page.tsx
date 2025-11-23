// app/(public)/login/page.tsx
"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";              // ⬅️ ใช้ next-auth
import AuthCard from "@/components/auth/AuthCard";
import TextField from "@/components/auth/TextField";
import PasswordField from "@/components/auth/PasswordField";

function isEmail(v: string) { return /.+@.+\..+/.test(v); }

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  function validate() {
    const next: typeof errors = {};
    if (!email) next.email = "กรอกอีเมล";
    else if (!isEmail(email)) next.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (!password) next.password = "กรอกรหัสผ่าน";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const res = await signIn("credentials", {
        redirect: false,       // รับผลลัพธ์เอง
        email,
        password,
      });
      if (res?.error) {
        setErrors({ form: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
      } else {
        router.push("/");      // สำเร็จ
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setErrors({ form: "เกิดข้อผิดพลาด กรุณาลองใหม่" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-white">
      <form onSubmit={onSubmit}>
        <AuthCard title="เข้าสู่ระบบ" subtitle="จัดการร้านค้า POS ของคุณ">
          {errors.form && <div className="mb-3 rounded-xl bg-red-50 text-red-700 px-3 py-2 text-sm">{errors.form}</div>}
          <TextField label="อีเมล" type="email" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)} error={errors.email} className="mb-3" />
          <PasswordField label="รหัสผ่าน" placeholder="รหัสผ่าน"
            value={password} onChange={e => setPassword(e.target.value)} error={errors.password} className="mb-4" />
          <button className="w-full rounded-xl px-4 py-2 font-medium text-white bg-[#faa500] hover:opacity-90 active:opacity-80 transition" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          <p className="mt-4 text-sm text-center text-gray-600">
            ยังไม่มีบัญชี? <Link href="/signup" className="text-[#faa500] underline">สมัครสมาชิก</Link>
          </p>
        </AuthCard>
      </form>
    </main>
  );
}
