import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AgentsDashboard } from "@/components/agents-dashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agent control room" };

export default async function AgentsAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  return (
    <div className="min-h-full bg-[var(--background)]">
      <nav className="border-b border-[var(--border)] px-4 py-3 text-sm">
        <Link href="/admin" className="text-emerald-700 underline">← Q&amp;A review queue</Link>
      </nav>
      <AgentsDashboard />
    </div>
  );
}
