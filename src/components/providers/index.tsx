"use client";

import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./auth-provider";
import { ThemeProvider } from "./theme-provider";
import { CartProvider } from "./cart-provider";
import { NotificationProvider } from "./notification-provider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          <CartProvider>
            <NotificationProvider>
              {children}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: "#1c1c24",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f4f4f5",
                  },
                }}
              />
            </NotificationProvider>
          </CartProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
