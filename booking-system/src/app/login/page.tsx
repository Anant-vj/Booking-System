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
    <main className="flex min-h-screen">
      {/* Left: College Image Placeholder */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute bottom-20 right-20 w-60 h-60 rounded-full bg-white/10" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-white/15" />
        </div>
        <div className="text-center text-white z-10 px-8">
          <div className="text-6xl mb-6">🏛️</div>
          <h2 className="text-3xl font-bold mb-3">College Hall Booking</h2>
          <p className="text-blue-200 text-lg max-w-sm mx-auto">
            Streamlined hall reservation system for faculty and administration
          </p>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white text-2xl mb-3">
              🏛️
            </div>
            <h1 className="text-2xl font-bold text-gray-900">College Hall Booking</h1>
            <p className="text-sm text-gray-500 mt-1">Management System</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-gray-900">Sign In</h1>
            <p className="mt-1 text-sm text-gray-600">
              Enter your credentials to access the system.
            </p>
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
              className="mt-6 grid gap-4"
            >
              <label className="grid gap-1.5 text-sm font-medium text-gray-700">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@college.edu"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-gray-700">
                Password
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </label>
              <button className="w-full rounded-lg bg-blue-600 px-3 py-2.5 text-white font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all mt-1">
                Sign In
              </button>
            </form>
            {error ? (
              <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                Login failed: {error}
              </p>
            ) : null}
          </div>

          <footer className="mt-6 text-center text-sm text-gray-400">
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
      </div>
    </main>
  );
}
