"use client";
import { InputHTMLAttributes } from "react";

export default function TextField({
  label,
  error,
  className = "",
  ...props
}: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        {...props}
        className={`w-full rounded-xl border px-3 py-2 outline-none transition
          ${error ? "border-red-300 ring-1 ring-red-200" : "border-gray-200 focus:ring-2 ring-[#faa500]"}`}
      />
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  );
}
