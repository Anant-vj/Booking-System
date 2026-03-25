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
      <div className="mx-4 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900">College Hall Booking</h1>
        <p className="mt-1 text-sm text-gray-600">Sign in with your account to continue.</p>
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
          <label className="grid gap-1 text-sm font-medium text-gray-700">
            Email
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-gray-700">
            Password
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors"
            />
          </label>
          <button className="w-full rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
            Sign In
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">Login failed: {error}</p> : null}
      </div>
      <footer className="absolute bottom-4 text-center text-sm text-gray-400">
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
    </main>
  );
}
