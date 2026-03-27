import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { ChangePasswordForm } from "@/components/change-password-form";
import { AppHeader } from "@/components/app-header";

export default async function ChangePasswordPage() {
  const authResult = await requireUser();
  if ("error" in authResult) {
    redirect("/login");
  }

  const { session } = authResult;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppHeader 
        role={session.user.role} 
        email={session.user.email!} 
        userName={session.user.name ?? undefined} 
      />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <ChangePasswordForm />
      </main>

      <footer className="py-6 text-center text-xs text-slate-500 font-medium">
        &copy; {new Date().getFullYear()} College Hall Booking System. All rights reserved.
      </footer>
    </div>
  );
}
