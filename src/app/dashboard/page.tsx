import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

      <section className={styles.empty}>
        <p>
          No directive yet — the Diagnostic (M1) hasn&apos;t run for this
          account, so there&apos;s no rock to descend a directive from.
        </p>
      </section>
    </main>
  );
}
