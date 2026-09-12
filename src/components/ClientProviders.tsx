"use client";

import { AuthProvider } from "@/lib/auth-context";
import { NotifyProvider } from "@/components/ui/Notify";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotifyProvider>{children}</NotifyProvider>
    </AuthProvider>
  );
}
