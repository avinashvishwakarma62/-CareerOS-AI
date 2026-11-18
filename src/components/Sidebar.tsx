
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { navigationGroups } from "@/lib/navigation";

import {
  LayoutDashboard,
  Target,
  CalendarDays,
  Bot,
  GraduationCap,
  Map,
  Code,
  Brain,
  Building2,
  FileUser,
  Briefcase,
  Flame,
  ChartNoAxesCombined,
  BrainCircuit,
  Settings,
  X,
  Sparkles,
  Sunrise,
  Bell,
  Mic,
  BookHeart,
  ClipboardCheck,
  Calculator,
  CalendarCheck,
  BookOpenCheck,
  Activity,
} from "lucide-react";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  target: Target,
  "calendar-days": CalendarDays,
  bot: Bot,
  "graduation-cap": GraduationCap,
  map: Map,
  code: Code,
  brain: Brain,
  "building-2": Building2,
  "file-user": FileUser,
  "briefcase-business": Briefcase,
  briefcase: Briefcase,
  flame: Flame,
  "chart-no-axes-combined": ChartNoAxesCombined,
  "brain-circuit": BrainCircuit,
  settings: Settings,
  sunrise: Sunrise,
  bell: Bell,
  mic: Mic,
  "book-heart": BookHeart,
  "clipboard-check": ClipboardCheck,
  calculator: Calculator,
  "calendar-check": CalendarCheck,
  "book-open-check": BookOpenCheck,
  activity: Activity,
};

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

const SCROLL_KEY = "careeros-sidebar-scroll";

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Restore sidebar scroll position after route changes/remounts.
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(SCROLL_KEY);

    if (navRef.current && savedPosition !== null) {
      navRef.current.scrollTop = Number(savedPosition);
    }
  }, [pathname]);

  // Save the sidebar's current scroll position.
  function handleSidebarScroll() {
    if (navRef.current) {
      sessionStorage.setItem(
        SCROLL_KEY,
        String(navRef.current.scrollTop)
      );
    }
  }

  return (
    <>
      {open && (
        <button
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-white/10 bg-[#080811] transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#9855FF] to-[#20C8FF]">
              <Sparkles className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-white">
                CareerOS AI
              </h1>

              <p className="text-[10px] tracking-widest text-gray-500">
                YOUR CAREER COMPANION
              </p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav
          ref={navRef}
          onScroll={handleSidebarScroll}
          className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-6"
        >
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-3 px-3 text-[10px] font-semibold tracking-[2px] text-gray-500">
                {group.title}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon =
                    iconMap[item.icon as keyof typeof iconMap];

                  const active =
                    pathname === item.href ||
                    (item.href !== "/" &&
                      pathname.startsWith(item.href + "/"));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      title={item.description}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                        active
                          ? "bg-gradient-to-r from-[#9855FF]/20 to-[#20C8FF]/10 text-white ring-1 ring-[#9855FF]/30"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {Icon ? (
                        <Icon
                          size={18}
                          className={
                            active
                              ? "text-[#B58AFF]"
                              : "text-gray-500"
                          }
                        />
                      ) : (
                        <span className="h-[18px] w-[18px]" />
                      )}

                      <span>{item.title}</span>

                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#20C8FF]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 bg-[#080811] p-4">
          <div className="rounded-xl border border-[#9855FF]/20 bg-[#9855FF]/10 p-3">
            <p className="text-xs font-semibold text-white">
              CareerOS AI
            </p>

            <p className="mt-1 text-[11px] text-gray-400">
              Your journey. Your growth. Your future.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
