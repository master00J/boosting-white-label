import type { Metadata } from "next";
import AdminSidebar from "@/components/layouts/admin-sidebar";
import AdminHeader from "@/components/layouts/admin-header";
import AdminRouteGuard from "@/components/admin/admin-route-guard";
import { AdminSetupCoach } from "@/components/admin/admin-setup-coach";

export const metadata: Metadata = {
  title: {
    template: "%s | Admin — BoostPlatform",
    default: "Admin — BoostPlatform",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRouteGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
      <AdminSetupCoach />
    </AdminRouteGuard>
  );
}
