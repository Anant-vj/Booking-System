import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";

export default async function LoginPage(props: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect(session.user.role === "ADMIN" ? "/admin" : "/faculty");

  const searchParams = await props.searchParams;
  const error = searchParams?.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">College Hall Booking</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in with your account to continue.</p>
        <form
          action={async (formData) => {
            "use server";
            try {
              await signIn("credentials", {
                email: formData.get("email"),
                password: formData.get("password"),
                redirectTo: "/",
              });
            } catch (authError) {
              if (authError instanceof AuthError) {
                redirect(`/login?error=${encodeURIComponent(authError.type)}`);
              }
              throw authError;
            }
          }}
          className="mt-4 grid gap-3"
        >
          <label className="grid gap-1 text-sm">
            Email
            <input
              name="email"
              type="email"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Password
            <input
              name="password"
              type="password"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
            />
          </label>
          <button className="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
            Sign In
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">Login failed: {error}</p> : null}
      </div>
    </main>
  );
}
