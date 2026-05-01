import type { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["user_role"];

export const PERMISSIONS = {
  // Orders
  "orders:read_own": ["customer", "worker", "admin", "super_admin"],
  "orders:read_all": ["admin", "super_admin"],
  "orders:create": ["customer", "admin", "super_admin"],
  "orders:update_status": ["admin", "super_admin"],
  "orders:claim": ["worker", "admin", "super_admin"],
  "orders:update_progress": ["worker", "admin", "super_admin"],
  "orders:complete": ["worker", "admin", "super_admin"],
  "orders:refund": ["admin", "super_admin"],
  "orders:delete": ["super_admin"],

  // Workers
  "workers:read_own": ["worker", "admin", "super_admin"],
  "workers:read_all": ["admin", "super_admin"],
  "workers:manage": ["admin", "super_admin"],
  "workers:approve": ["admin", "super_admin"],
  "workers:promote": ["admin", "super_admin"],

  // Games & Services
  "games:read": ["customer", "worker", "admin", "super_admin"],
  "games:manage": ["admin", "super_admin"],
  "services:read": ["customer", "worker", "admin", "super_admin"],
  "services:manage": ["admin", "super_admin"],

  // Finance
  "finance:read": ["admin", "super_admin"],
  "payouts:read_own": ["worker", "admin", "super_admin"],
  "payouts:process": ["admin", "super_admin"],

  // Admin
  "admin:access": ["admin", "super_admin"],
  "settings:manage": ["admin", "super_admin"],
  "users:ban": ["admin", "super_admin"],
  "users:delete": ["super_admin"],
  "api_keys:manage": ["super_admin"],
} as const satisfies Record<string, UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}
