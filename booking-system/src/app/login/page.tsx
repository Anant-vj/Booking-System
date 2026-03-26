import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

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
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-slate-100 relative overflow-hidden border-r border-slate-200">
        {/* IMAGE PLACEHOLDER: See /README-ASSETS.md */}
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-slate-400 font-mono text-sm border-[3px] border-dashed border-slate-300 m-8 rounded-2xl bg-slate-50">
           <span className="font-bold text-lg text-slate-500">[ LOGIN BACKGROUND ]</span>
           <span className="mt-2 text-xs">/public/images/login-bg.jpg</span>
           <span className="mt-1 text-xs">Recommended: 1920x1080px</span>
        </div>
        
        {/* Overlay content - you can remove this entirely when using a real image if you prefer */}
        <div className="text-center text-slate-800 z-10 px-8 relative bg-white/70 backdrop-blur-md p-10 rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50">
          <div className="text-6xl mb-6">🏛️</div>
          <h2 className="text-3xl font-extrabold mb-3">College Hall Booking</h2>
          <p className="text-slate-600 text-lg max-w-sm mx-auto font-medium">
            Streamlined hall reservation system for faculty and administration
          </p>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 text-slate-500 text-[10px] mb-3 leading-tight font-bold shadow-sm">
              Logo<br/>(logo.png)
            </div>
            <h1 className="text-2xl font-bold text-gray-900">College Hall Booking</h1>
            <p className="text-sm text-gray-500 mt-1">Management System</p>
          </div>

          <LoginForm error={error} />

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
              Seshan J
            </a>
          </footer>
        </div>
      </div>
    </main>
  );
}
