import { LoginForm } from "@/components/login-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="container" style={{ minHeight: "45vh", padding: "54px 0 68px" }}>
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div className="eyebrow">Member access</div>
            <h1 className="display" style={{ fontSize: 42, margin: "12px 0" }}>Welcome back.</h1>
            <p className="muted" style={{ fontSize: 12 }}>Sign in to manage your seller submissions or access the Sellfast administration workspace.</p>
          </div>
          <LoginForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
