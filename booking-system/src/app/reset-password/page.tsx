"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound } from "lucide-react";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing password reset token.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setStatus("success");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(data.error || "Failed to reset password");
      }
    } catch (err) {
      setStatus("error");
      setMessage("An unexpected error occurred");
    }
  };

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="rounded-md bg-green-50 p-4 border border-green-200">
          <h3 className="text-sm font-medium text-green-800">Password Reset Successful</h3>
          <p className="mt-2 text-sm text-green-700">You will be redirected to the login page shortly.</p>
        </div>
        <div className="mt-6">
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">Go to login now</Link>
        </div>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {status === "error" && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-medium text-red-800">{message}</h3>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">New Password</label>
          <input
            type="password"
            required
            disabled={!token || status === "loading"}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm disabled:opacity-50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
          <input
            type="password"
            required
            disabled={!token || status === "loading"}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm disabled:opacity-50"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={!token || status === "loading"}
          className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {status === "loading" ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow border border-gray-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <KeyRound className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Create New Password
          </h2>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-gray-500 mt-6">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
