// src/app/(dashboard)/layout.tsx
"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] w-full bg-zinc-50 text-zinc-900">
        {/* ซ้าย: Sidebar */}
        <AppSidebar />

        {/* ขวา: เนื้อหา */}
        <div className="flex min-h-[100dvh] flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-white/80 px-4 supports-[backdrop-filter]:backdrop-blur-md">
            <SidebarTrigger className="h-9 w-9 rounded-lg border border-zinc-200" />
            <div className="ml-1 text-sm font-medium text-zinc-800">แดชบอร์ด</div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
