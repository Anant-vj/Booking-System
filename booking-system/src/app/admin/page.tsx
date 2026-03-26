import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AppHeader } from "@/components/app-header";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/faculty");

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <AppHeader
          role="ADMIN"
          email={session.user.email ?? ""}
          userName={session.user.name ?? undefined}
        />
        <AdminDashboard />
        <footer className="mt-6 mb-2 text-center text-sm text-gray-400">
          <span className="text-pink-400 mr-1">✦</span>
          Crafted by{" "}
          <a
            href="https://www.linkedin.com/in/anantharamanvj/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-600 transition-colors duration-150 hover:text-blue-600 hover:underline cursor-pointer"
          >
            Anantha Raman V J
          </a>{" "}
          &{" "}
          <a
            href="https://www.linkedin.com/in/seshan-j-956952268/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-600 transition-colors duration-150 hover:text-blue-600 hover:underline cursor-pointer"
          >
            Seshann J
          </a>
        </footer>
      </div>
    </main>
  );
}
