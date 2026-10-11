"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (!error) {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <button className="signout-link" type="button" onClick={signOut} disabled={busy} aria-label="Sign out">
      <LogOut size={14} /> {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
