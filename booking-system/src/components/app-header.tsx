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
          {/* LOGO PLACEHOLDER: See /README-ASSETS.md for replacement instructions */}
          <div 
            className="flex h-11 w-32 items-center justify-center rounded bg-slate-100 border border-dashed border-slate-300 text-slate-500 text-xs font-bold shrink-0 overflow-hidden relative"
            title="Replace me with /public/images/logo.png"
          >
            <span className="z-10 text-center px-1">Logo Space<br/><span className="font-normal text-[10px]">(logo.png)</span></span>
            {/* <img src="/images/logo.png" alt="Logo" className="absolute inset-0 w-full h-full object-contain" /> */}
          </div>
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
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
