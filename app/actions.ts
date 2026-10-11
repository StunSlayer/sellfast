"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const inquiryTypes = ["buy_listing", "sell_watch", "trade", "general"];

function returnUrl(target: string, ok: boolean) {
  const hashIndex = target.indexOf("#");
  const hash = hashIndex >= 0 ? target.slice(hashIndex) : "";
  const path = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/contact";
  const separator = safePath.includes("?") ? "&" : "?";
  return safePath + separator + "sent=" + (ok ? "1" : "0") + hash;
}

export async function submitPublicInquiry(formData: FormData) {
  const rawTarget = String(formData.get("return_to") || "/contact");
  const successUrl = (ok: boolean) => returnUrl(rawTarget, ok);

  // Honeypot spam trap. Do not create lead records from bot-filled forms.
  if (String(formData.get("company_website") || "").trim()) redirect(successUrl(true));

  const full_name = String(formData.get("full_name") || "").trim().slice(0, 120);
  const email = String(formData.get("email") || "").trim().slice(0, 254);
  const phone = String(formData.get("phone") || "").trim().slice(0, 40);
  const message = String(formData.get("message") || "").trim().slice(0, 5000);
  const inquiry_type = String(formData.get("inquiry_type") || "general");
  const listing_id = String(formData.get("listing_id") || "").trim() || null;

  if (full_name.length < 2 || !message || (!email && !phone) || !inquiryTypes.includes(inquiry_type)) {
    redirect(successUrl(false));
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const extras = ["watch_brand", "watch_model", "watch_reference", "expected_price", "condition"]
    .map((key) => {
      const value = String(formData.get(key) || "").trim().slice(0, 180);
      return value ? key.replaceAll("_", " ") + ": " + value : "";
    })
    .filter(Boolean);

  const { error } = await supabase.from("inquiries").insert({
    listing_id,
    inquiry_type,
    full_name,
    email: email || null,
    phone: phone || null,
    message: [message, ...extras].join("\n\n").slice(0, 5000),
    submitted_by: auth.user?.id || null,
  });

  if (error) redirect(successUrl(false));
  redirect(successUrl(true));
}
