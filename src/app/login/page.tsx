"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setNotice("Check your email to confirm your account before logging in.");
    }
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] bg-surface border border-border rounded-2xl p-10 flex flex-col gap-7">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="font-display font-bold text-2xl">Strategix</div>
          <div className="text-sm text-text-secondary">Algorithmic strategy marketplace</div>
        </div>

        {error && (
          <div className="bg-[#FDE7E5] border border-[#F3B4AE] text-[#8A1F1B] rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-[#E3F3EA] border border-[#B7E0C7] text-[#16794F] rounded-lg px-4 py-3 text-sm">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-2 focus:outline-accent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center bg-accent text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "login" ? "Log In" : "Create account"}
          </button>
        </form>

        <div className="flex justify-center text-sm">
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setNotice(null); }}
              className="text-accent font-medium"
            >
              Don&apos;t have an account? Create one
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); setNotice(null); }}
              className="text-text-secondary"
            >
              Already have an account? Log in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
