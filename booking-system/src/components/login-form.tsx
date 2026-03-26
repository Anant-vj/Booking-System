"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/actions/auth-actions";

interface LoginFormProps {
  error?: string;
}

export function LoginForm({ error }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-gray-900">Sign In</h1>
      <p className="mt-1 text-sm text-gray-600">
        Enter your credentials to access the system.
      </p>
      <form action={loginAction} className="mt-6 grid gap-4">
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
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </label>
        <button className="w-full rounded-lg bg-blue-600 px-3 py-2.5 text-white font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all mt-1">
          Sign In
        </button>
      </form>
      {error ? (
        <div className="mt-5 flex items-start gap-3 text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3 border border-red-200 shadow-sm">
          <span className="text-lg">⚠️</span>
          <span className="font-semibold pt-0.5">Invalid email or password</span>
        </div>
      ) : null}
    </div>
  );
}
