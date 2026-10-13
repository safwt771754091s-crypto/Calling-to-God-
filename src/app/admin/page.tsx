import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { ModerationQueue } from "@/components/moderation-queue";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const questions = await prisma.question.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true },
    take: 100,
  });

  const counts = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.status] = (acc[q.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Q&amp;A review queue</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Signed in as {session.user.email} · role {(session.user as { role?: string }).role}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="/admin/agents" className="rounded-full bg-[var(--primary)] px-3 py-1 font-semibold text-[var(--primary-foreground)]">
            Dawah agents →
          </Link>
          {Object.entries(counts).map(([k, v]) => (
            <span key={k} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-semibold">
              {k}: {v}
            </span>
          ))}
        </div>
      </header>

      {questions.length === 0 ? (
        <p className="card p-8 text-center text-[var(--muted-foreground)]">No questions yet.</p>
      ) : (
        <ModerationQueue initial={JSON.parse(JSON.stringify(questions))} />
      )}
    </div>
  );
}
