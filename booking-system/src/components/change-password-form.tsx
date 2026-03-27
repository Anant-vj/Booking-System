"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChangePasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setSuccess("Password updated successfully! Redirecting...");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 mb-2">Change Password</h2>
      <p className="text-sm text-slate-600 mb-6 font-medium">
        Update your account security by choosing a new password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-black text-slate-900 uppercase tracking-wider mb-1.5">
            Current Password
          </label>
          <input
            type="password"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-sm font-black text-slate-900 uppercase tracking-wider mb-1.5">
            New Password
          </label>
          <input
            type="password"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            placeholder="••••••••"
          />
          <p className="mt-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-tight">Minimum 6 characters required</p>
        </div>

        <div>
          <label className="block text-sm font-black text-slate-900 uppercase tracking-wider mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-2">
            <span>✅</span> {success}
          </div>
        )}

        <div className="pt-2 flex flex-col gap-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full bg-white text-slate-700 font-bold py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-all text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
