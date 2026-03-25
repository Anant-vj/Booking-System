import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { FacultyDashboard } from "@/components/faculty-dashboard";
import { LogoutButton } from "@/components/logout-button";

export default async function FacultyPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin");

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Faculty Dashboard</h1>
            <p className="text-sm text-gray-500">{session.user.email}</p>
          </div>
          <LogoutButton />
        </header>
        <FacultyDashboard />
      </div>
    </main>
  );
}
