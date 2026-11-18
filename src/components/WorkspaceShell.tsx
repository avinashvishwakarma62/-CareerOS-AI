
"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Menu } from "lucide-react";

export default function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080811] text-white">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="lg:ml-[270px] min-h-screen">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#080811]/95 p-4">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-lg border border-white/10 p-2"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <span className="font-semibold">
            CareerOS AI
          </span>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
