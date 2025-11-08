"use client";
import { useState, InputHTMLAttributes } from "react";

export default function PasswordField({
  label,
  error,
  className = "",
  ...props
}: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={show ? "text" : "password"}
          className={`w-full rounded-xl border px-3 py-2 pr-12 outline-none transition
            ${error ? "border-red-300 ring-1 ring-red-200" : "border-gray-200 focus:ring-2 ring-[#faa500]"}`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500"
        >
          {show ? "ซ่อน" : "แสดง"}
        </button>
      </div>
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  );
}
