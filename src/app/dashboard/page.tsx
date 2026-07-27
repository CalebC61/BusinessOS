import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { MODULE_LABELS, type ConstraintModule } from "@/lib/diagnostic/tree";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS scopes this to the signed-in user's own rock via the cycle join policy —
  // no explicit user filter needed (BLUEPRINT.md §4.2 / supabase/migrations/0001_init.sql).
  const { data: rock } = await supabase
    .from("rock")
    .select("statement, constraint_module")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: day0Scales } = await supabase
    .from("scale_administration")
    .select("instrument")
    .eq("cycle_day", 0);

  const { data: values } = await supabase
    .from("user_values")
    .select("id")
    .order("selected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const scalesDone = new Set((day0Scales ?? []).map((s) => s.instrument)).size;
  const baselineComplete = scalesDone >= 3 && Boolean(values);

  const { data: profitBaseline } = await supabase
    .from("profit_baseline")
    .select("source, trailing_12mo_pnl")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Operator</p>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Dashboard</h1>
          <form action={signOut}>
            <button className={styles.signOut} type="submit">
              Sign out
            </button>
          </form>
        </div>
        <p className={styles.subtitle}>Signed in as {user.email}</p>
      </header>

      {rock ? (
        <section className={styles.rock}>
          <p className={styles.rockLabel}>
            90-day rock &middot; {MODULE_LABELS[rock.constraint_module as ConstraintModule]}
          </p>
          <p className={styles.rockStatement}>{rock.statement}</p>
          <p className={styles.rockFootnote}>
            No directive yet — the daily loop (M4) hasn&apos;t shipped, so
            there&apos;s nowhere yet to descend today&apos;s action from this rock.
          </p>
        </section>
      ) : (
        <section className={styles.empty}>
          <p>
            No rock yet — run the diagnostic to name your constraint and
            propose a 90-day rock.
          </p>
          <Link className={styles.cta} href="/diagnostic">
            Start the diagnostic
          </Link>
        </section>
      )}

      {baselineComplete ? (
        <p className={styles.baselineDone}>Day-0 baseline &middot; complete</p>
      ) : (
        <section className={styles.empty}>
          <p>
            Baseline not complete — WHO-5, NGSE, IPS, and your 3 values
            ({scalesDone}/3 scales done{values ? "" : ", values not set"}).
          </p>
          <Link className={styles.cta} href="/baseline">
            {scalesDone > 0 || values ? "Continue baseline" : "Start baseline"}
          </Link>
        </section>
      )}

      {profitBaseline ? (
        <p className={styles.baselineDone}>
          Profit baseline &middot; complete ({profitBaseline.source})
        </p>
      ) : (
        <section className={styles.empty}>
          <p>No profit baseline yet — connect Xero or enter your trailing 12-month P&amp;L.</p>
          <Link className={styles.cta} href="/profit">
            Set profit baseline
          </Link>
        </section>
      )}
    </main>
  );
}
