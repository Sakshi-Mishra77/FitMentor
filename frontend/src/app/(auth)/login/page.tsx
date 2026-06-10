// frontend/src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AxiosError } from "axios";
import api from "@/services/api";
import { useAuth } from "@/store/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((state) => state.login);
  
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = { ...formData, name: "string" }; 
      const response = await api.post("/auth/login", payload);
      
      login(response.data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const detail =
        err instanceof AxiosError && typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Invalid email or password.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900 selection:bg-teal-200">
      {/* Left Panel - Branding (Hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-50 border-r border-slate-200 p-12">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-600 font-bold text-white">AI</div>
            <span className="text-xl font-bold tracking-tight text-slate-900">FitMentor</span>
          </Link>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Welcome back to your workspace.</h2>
          <p className="text-slate-600 text-lg">Sign in to track your performance, review past interviews, or start a new mock session.</p>
        </div>
        <div className="text-sm text-slate-500">&copy; {new Date().getFullYear()} AI Interview Platform.</div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex flex-1 items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Sign In</h2>
            <p className="mt-2 text-sm text-slate-600">Access your dashboard and reports.</p>
          </div>
          
          {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 border border-red-100">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <Link href="#" className="text-sm font-medium text-teal-600 hover:text-teal-500">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full rounded-lg border border-slate-300 px-4 py-3 pr-20 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-3 my-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                  >
                    {showPassword ? (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-7.5a11.65 11.65 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A10.73 10.73 0 0 1 12 4c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-2.38 3.6" />
                        <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                        <path d="m1 1 22 22" />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-50 transition-all"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
          
          <p className="text-center lg:text-left text-sm text-slate-600 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-teal-600 hover:text-teal-500 transition-colors">
              Create one today
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
