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
      {/* Left: Clean College Background Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-slate-100 border-r border-slate-200">
        <img 
          src="/images/login-bg.jpg" 
          alt="Mannar Thirumalai Naicker College Campus" 
          className="absolute inset-0 z-0 h-full w-full object-cover" 
        />
      </div>

      {/* Right: Login Section */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 bg-slate-50 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Branding Repositioned to Right Top */}
          <div className="text-center flex flex-col items-center">
            <img
              src="/images/logo.png"
              alt="College Logo"
              className="w-16 h-16 object-contain mx-auto mb-2"
            />
            <h1 className="text-2xl font-bold text-gray-900">
              College Hall Booking
            </h1>
            <p className="text-sm text-gray-500 mt-1">Management System</p>
          </div>

          {/* Login Card below branding */}
          <div className="bg-white rounded-xl shadow-lg p-6 w-full border border-slate-200">
            <LoginForm error={error} />
          </div>

          <footer className="mt-8 text-center text-sm text-gray-400">
            <span className="text-pink-400 mr-1 font-bold">✦</span>
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
