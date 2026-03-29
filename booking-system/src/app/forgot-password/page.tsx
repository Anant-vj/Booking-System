"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(data.error || "Failed to process request");
      }
    } catch (err) {
      setStatus("error");
      setMessage("An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow border border-gray-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <KeyRound className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Forgot Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email to receive a password reset link.
          </p>
        </div>

        {status === "success" ? (
          <div className="mt-8">
            <div className="rounded-md bg-green-50 p-4 border border-green-200 text-center">
              <h3 className="text-sm font-medium text-green-800">
                Check your inbox!
              </h3>
              <p className="mt-2 text-sm text-green-700">
                We've sent a password reset link to <span className="font-bold">{email}</span>. Please check your spam folder if you don't see it.
              </p>
            </div>
            <div className="mt-6 text-center">
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Return to login
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {status === "error" && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <h3 className="text-sm font-medium text-red-800">{message}</h3>
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={status === "loading"}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {status === "loading" ? "Sending..." : "Send reset link"}
              </button>
            </div>

            <div className="text-center">
              <Link href="/login" className="font-medium text-sm text-blue-600 hover:text-blue-500">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
