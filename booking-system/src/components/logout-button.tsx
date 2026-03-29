import { handleLogout } from "@/actions/auth";

export function LogoutButton() {
  return (
    <form action={handleLogout}>
      <button
        type="submit"
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
      >
        Logout
      </button>
    </form>
  );
}
