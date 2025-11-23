import { ReactNode } from "react";
import Image from "next/image";

export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col items-center mb-4">
        <Image
          src="/logo.png"
          alt="Logo"
          width={120}
          height={120}
          className="mb-3"
        />
        <h1 className="text-2xl font-bold mb-1">{title}</h1>
        {subtitle && <p className="text-gray-500 mb-4">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
