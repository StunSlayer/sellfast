import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export default function Page(){return <><SiteHeader/><main className="container" style={{minHeight:"45vh",padding:"55px 0 70px"}}><div style={{maxWidth:460,margin:"0 auto"}}><div style={{textAlign:"center",marginBottom:22}}><div className="eyebrow">Account recovery</div><h1 className="display" style={{fontSize:40,margin:"12px 0"}}>Reset your password.</h1><p className="muted" style={{fontSize:12}}>We will send password recovery instructions to your account email.</p></div><ForgotPasswordForm/></div></main><SiteFooter/></>}
