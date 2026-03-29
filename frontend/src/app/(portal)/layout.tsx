"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useSidebarStore } from "@/lib/sidebar-store";
import { useTourStore } from "@/lib/tour-store";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const sidebarWidth = collapsed ? 72 : 240;

  const { hasSeenTour, startTour } = useTourStore();

  // Auto-start tour on first visit
  useEffect(() => {
    if (!hasSeenTour) {
      const timer = setTimeout(() => startTour(), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour, startTour]);

  return (
    <div className="min-h-screen">
      <Sidebar />
      {/* Main content — positioned after sidebar using dynamic left margin */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Header />
        <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
      </div>

      {/* Onboarding Tour Overlay */}
      <OnboardingTour />
    </div>
  );
}
