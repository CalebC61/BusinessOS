import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllScaleDefinitions, getValuesDeck } from "@/lib/scales/definitions";
import { BaselineWizard } from "./wizard";

export default async function BaselinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <BaselineWizard scales={getAllScaleDefinitions()} valuesDeck={getValuesDeck()} />
  );
}
