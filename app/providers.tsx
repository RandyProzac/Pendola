"use client";

import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicReadRoute = pathname.startsWith("/leer/");

  return (
    <ThemeProvider defaultTheme="dark" storageKey="pendola-theme">
      <TooltipProvider>
        {isPublicReadRoute ? (
          children
        ) : (
          <AuthGate>
            <SidebarProvider>
              <div className="flex min-h-screen w-full">
                <AppSidebar />
                <main className="flex-1 overflow-auto">{children}</main>
              </div>
            </SidebarProvider>
          </AuthGate>
        )}
      </TooltipProvider>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}
