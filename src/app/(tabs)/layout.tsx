"use client";

import { usePathname } from "next/navigation";
import { useEntries } from "@/hooks/useEntries";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { dataUpdatedAt } = useEntries();

  return (
    <div className="flex h-full">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent-soft focus:text-fg focus:rounded-lg">
        Hopp til hovedinnhold
      </a>
      <Sidebar pathname={pathname} dataUpdatedAt={dataUpdatedAt} />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <MobileNav pathname={pathname} />

        <main id="main-content" className="flex-1 overflow-y-auto pb-nav md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
