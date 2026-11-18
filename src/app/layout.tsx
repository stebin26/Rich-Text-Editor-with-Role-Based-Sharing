import type { Metadata } from "next";
import type { ReactNode } from "react";

import ToastProvider from "@/components/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ajaia Docs",
    template: "%s · Ajaia Docs",
  },
  description:
    "A small collaborative document editor: create, format, import and share documents.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
