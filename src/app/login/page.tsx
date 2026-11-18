
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) throw error;

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage(
            "Account created! Check your email to confirm your account, then log in."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.replace("/");
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080811] px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11111e] p-7 shadow-2xl sm:p-9">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 text-2xl font-bold">
            C
          </div>

          <h1 className="text-2xl font-bold">
            CareerOS <span className="text-violet-400">AI</span>
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Your Growth Companion
          </p>
        </div>

        <div className="mb-7 grid grid-cols-2 rounded-xl bg-black/30 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            className={`rounded-lg py-3 text-sm font-semibold ${
              mode === "login"
                ? "bg-violet-600 text-white"
                : "text-gray-400"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
            className={`rounded-lg py-3 text-sm font-semibold ${
              mode === "signup"
                ? "bg-violet-600 text-white"
                : "text-gray-400"
            }`}
          >
            Sign Up
          </button>
        </div>

        <h2 className="text-xl font-bold">
          {mode === "login" ? "Welcome back!" : "Create your account"}
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          {mode === "login"
            ? "Login to continue your growth journey."
            : "Start building your personal growth system."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          {mode === "signup" && (
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-500"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-500"
            />
          </div>

          {message && (
            <p className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-sm text-violet-200">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3.5 font-semibold transition hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login to CareerOS →"
              : "Create Account →"}
          </button>
        </form>

        <p className="mt-7 text-center text-xs text-gray-500">
          Secure personal workspace · CareerOS AI
        </p>
      </div>
    </main>
  );
}
