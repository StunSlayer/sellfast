import { SignUpForm } from "@/components/sign-up-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="container" style={{ minHeight: "45vh", padding: "54px 0 68px" }}>
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div className="eyebrow">Create an account</div>
            <h1 className="display" style={{ fontSize: 42, margin: "12px 0" }}>Join Sellfast.</h1>
            <p className="muted" style={{ fontSize: 12 }}>Create an account to apply as a seller and manage your submissions. You can browse watches without registering.</p>
          </div>
          <SignUpForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
