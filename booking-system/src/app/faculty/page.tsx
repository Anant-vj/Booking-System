import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { FacultyDashboard } from "@/components/faculty-dashboard";
import { AppHeader } from "@/components/app-header";

export default async function FacultyPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin");

  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden bg-slate-50 p-4 md:p-8">
      <div className="w-full flex flex-col overflow-y-auto mx-auto max-w-5xl">
        <AppHeader
          role="FACULTY"
          email={session.user.email ?? ""}
          userName={session.user.name ?? undefined}
        />
        <FacultyDashboard />
      </div>
    </main>
  );
}
