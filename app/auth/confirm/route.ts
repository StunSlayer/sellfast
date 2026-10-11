import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

function safeNext(value: string | null) {
  const target = value ?? "/";
  return target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  // PKCE callback used by the default Supabase confirmation/reset links.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    redirect("/auth/error?error=" + encodeURIComponent(error.message));
  }

  // Token-hash callback supported by the custom Supabase email template.
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
    redirect("/auth/error?error=" + encodeURIComponent(error.message));
  }

  redirect("/auth/error?error=Missing+confirmation+code");
}
