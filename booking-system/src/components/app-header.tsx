import { LogoutButton } from "@/components/logout-button";

type AppHeaderProps = {
  role: "ADMIN" | "FACULTY";
  email: string;
  userName?: string;
};

export function AppHeader({ role, email, userName }: AppHeaderProps) {
  return (
    <header className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <img 
            src="/images/logo.png" 
            alt="Mannar Thirumalai Naicker College Logo" 
            className="h-12 w-auto object-contain shrink-0 pr-1" 
          />
          <div>
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">
              College Hall Booking
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Management System</p>
          </div>
        </div>

        {/* Right: User info + Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                role === "ADMIN"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {role}
            </span>
            <div className="hidden sm:block text-right">
              {userName && (
                <p className="text-sm font-medium text-gray-800 leading-tight">{userName}</p>
              )}
              <p className="text-xs text-gray-500">{email}</p>
            </div>
            <p className="text-xs text-gray-500 sm:hidden">{email}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
              href="/change-password"
              className="hidden md:inline-flex items-center rounded border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Change Password
            </a>
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
