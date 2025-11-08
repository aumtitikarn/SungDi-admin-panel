"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Store, Table, Utensils, ReceiptText } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { href: "/store",   label: "จัดการร้านค้า",   icon: Store },
  { href: "/tables",  label: "จัดการที่นั่ง",    icon: Table },
  { href: "/menu",    label: "จัดการเมนูอาหาร", icon: Utensils },
  { href: "/billing", label: "จัดการบิล",       icon: ReceiptText },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
  }

  return (
    <Sidebar className="border-r bg-white/80 supports-[backdrop-filter]:backdrop-blur-md">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="h-8 w-8 rounded-md shadow" style={{ backgroundColor: "#faa500" }} />
          <div className="text-sm font-semibold text-primary">POS Admin</div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={label}>
                      <Link href={href} className="gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild onClick={onLogout} className="gap-3">
              <button type="button" className="w-full text-left">
                <LogOut className="h-4 w-4" />
                <span>ออกจากระบบ</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
