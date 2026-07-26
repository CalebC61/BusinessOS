"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "./actions";
import { initialAuthState } from "./types";
import styles from "./login.module.css";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signInPending] = useActionState(
    signIn,
    initialAuthState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUp,
    initialAuthState,
  );

  const action = mode === "signin" ? signInAction : signUpAction;
  const state = mode === "signin" ? signInState : signUpState;
  const pending = mode === "signin" ? signInPending : signUpPending;

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Operator</p>
        <h1 className={styles.title}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>

        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === "signin" ? styles.tabActive : styles.tab}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "signup" ? styles.tabActive : styles.tab}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
        </div>

        {mode === "signup" && signUpState.success ? (
          <p className={styles.success}>
            Check your email to confirm your account, then sign in.
          </p>
        ) : (
          <form action={action} className={styles.form}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />

            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              className={styles.input}
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              minLength={6}
              required
            />

            {state.error && <p className={styles.error}>{state.error}</p>}

            <button className={styles.submit} type="submit" disabled={pending}>
              {pending
                ? "Working…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
