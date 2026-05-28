import { Lock } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase, type SupabaseSession } from "../lib/supabase";

export function AuthGate({ children }: { children: (session: SupabaseSession | null) => ReactNode }) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <>
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900">
          Cloud sync is not configured yet. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local` to enable login and saved workspaces.
        </div>
        {children(null)}
      </>
    );
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f5f5] px-5">
        <div className="rounded-lg border border-line bg-white p-6 text-sm font-bold text-ink shadow-card">Loading secure workspace...</div>
      </div>
    );
  }

  if (!session) {
    const submit = async () => {
      if (!supabase) return;
      setMessage("");
      const action =
        mode === "sign-in"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({ email, password });
      const { error } = await action;
      if (error) {
        setMessage(error.message);
      } else if (mode === "sign-up") {
        setMessage("Account created. Check your email if Supabase asks for confirmation, then sign in.");
      }
    };

    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f5f5] px-5">
        <section className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Secure Workspace</div>
              <h1 className="text-2xl font-extrabold text-ink">Amazon P&L Login</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-steel">
            Sign in to save clients, processed P&L data, goals, and scenarios to Supabase. Raw uploaded reports are still processed in your browser.
          </p>
          <div className="mt-5 grid gap-3">
            <label className="block">
              <span className="text-sm font-bold text-ink">Email</span>
              <input className="mt-2 w-full rounded-md border border-line px-3 py-2.5 outline-none focus:border-brand" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink">Password</span>
              <input type="password" className="mt-2 w-full rounded-md border border-line px-3 py-2.5 outline-none focus:border-brand" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          </div>
          {message ? <div className="mt-4 rounded-md border border-line bg-warm px-3 py-2 text-sm font-semibold text-ink">{message}</div> : null}
          <button type="button" onClick={submit} className="mt-5 w-full rounded-full bg-brand px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white hover:bg-deep">
            {mode === "sign-in" ? "Sign In" : "Create Account"}
          </button>
          <button type="button" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")} className="mt-3 w-full rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink hover:bg-warm">
            {mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </section>
      </div>
    );
  }

  return <>{children(session)}</>;
}
