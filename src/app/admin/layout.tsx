import { SessionProvider } from "next-auth/react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" className="min-h-full bg-[var(--background)]">
      <SessionProvider>{children}</SessionProvider>
    </div>
  );
}
