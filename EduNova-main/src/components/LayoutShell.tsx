"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { ReferralTracker } from "@/components/ReferralTracker";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <ReferralTracker />
      <Navbar />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </>
  );
}
