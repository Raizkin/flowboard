"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "recover" | "reset";

const copy: Record<
  AuthMode,
  { title: string; subtitle: string; button: string }
> = {
  "sign-in": {
    title: "Welcome back",
    subtitle: "Sign in to pick up where your team left off.",
    button: "Sign in",
  },
  "sign-up": {
    title: "Create your account",
    subtitle: "Set up your workspace and get your team moving.",
    button: "Create account",
  },
  recover: {
    title: "Reset your password",
    subtitle: "We’ll email you a secure link to get back in.",
    button: "Send reset link",
  },
  reset: {
    title: "Choose a new password",
    subtitle: "Use at least 8 characters for your new password.",
    button: "Update password",
  },
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  const content = copy[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    if (!supabase) {
      setError(
        "Account login is not connected yet. Add the Supabase URL and publishable key to .env.local, then restart the app.",
      );
      return;
    }
    if (
      (mode === "sign-in" || mode === "sign-up" || mode === "reset") &&
      password.length < 8
    ) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "sign-in") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        const target = new URLSearchParams(window.location.search).get("next");
        router.replace(target?.startsWith("/") ? target : "/dashboard");
        router.refresh();
      } else if (mode === "sign-up") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          setNotice("Check your inbox to confirm your account, then sign in.");
        }
      } else if (mode === "recover") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
          },
        );
        if (authError) throw authError;
        setNotice(
          "If an account uses that email, a password reset link is on its way.",
        );
      } else {
        const { error: authError } = await supabase.auth.updateUser({
          password,
        });
        if (authError) throw authError;
        setNotice("Your password has been updated.");
        window.setTimeout(() => {
          router.replace("/dashboard");
          router.refresh();
        }, 800);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <Link
        className="brand auth-brand"
        href="/dashboard"
        aria-label="Flowboard home"
      >
        <span className="brand-mark">
          <span />
        </span>
        <span>
          flow<span className="brand-accent">board</span>
        </span>
      </Link>
      <section className="auth-card">
        <div className="auth-heading">
          <span className="auth-icon">
            <Icon name="spark" size={20} />
          </span>
          <h1>{content.title}</h1>
          <p>{content.subtitle}</p>
        </div>
        {!supabase && (
          <div className="auth-setup-note">
            <strong>Supabase setup needed</strong>
            <span>
              Copy <code>.env.example</code> to <code>.env.local</code>, add
              your Supabase project URL and publishable key, then restart the
              dev server.
            </span>
          </div>
        )}
        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <form className="auth-form" onSubmit={submit}>
          {mode === "sign-up" && (
            <label className="form-field">
              <span>Your name</span>
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Morgan"
                required
              />
            </label>
          )}
          {mode !== "reset" && (
            <label className="form-field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
              />
            </label>
          )}
          {mode !== "recover" && (
            <label className="form-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  mode === "sign-in"
                    ? "Enter your password"
                    : "At least 8 characters"
                }
                minLength={8}
                required
              />
            </label>
          )}
          {mode === "sign-in" && (
            <div className="auth-forgot">
              <Link href="/forgot-password">Forgot password?</Link>
            </div>
          )}
          <button
            className="button button-primary auth-submit"
            disabled={busy || !supabase}
          >
            {busy ? "Please wait…" : content.button}
            <Icon name="arrow" size={15} />
          </button>
        </form>
        <div className="auth-switch">
          {mode === "sign-in" ? (
            <>
              New to Flowboard? <Link href="/signup">Create an account</Link>
            </>
          ) : mode === "sign-up" ? (
            <>
              Already have an account? <Link href="/login">Sign in</Link>
            </>
          ) : (
            <Link href="/login">Back to sign in</Link>
          )}
        </div>
      </section>
      <p className="auth-footer">A calmer way to move work forward.</p>
    </main>
  );
}
