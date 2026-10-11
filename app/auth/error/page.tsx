import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
async function ErrorContent({searchParams}:{searchParams:Promise<{error?:string}>}){const params=await searchParams;return <p className="muted" style={{fontSize:12,overflowWrap:"anywhere"}}>{params?.error?params.error:"An unspecified authentication error occurred."}</p>}
export default function Page({searchParams}:{searchParams:Promise<{error?:string}>}){return <><SiteHeader/><main className="container" style={{minHeight:"45vh",padding:"55px 0 70px"}}><div className="form-card" style={{maxWidth:540,margin:"0 auto"}}><AlertTriangle size={32} style={{color:"#8c7447"}}/><h1 className="display" style={{fontSize:37,margin:"12px 0"}}>We couldn't complete that step.</h1><Suspense><ErrorContent searchParams={searchParams}/></Suspense><div className="hero-actions"><Link href="/auth/login" className="button">Return to sign in</Link><Link href="/" className="button button-outline">Return to storefront</Link></div></div></main><SiteFooter/></>}
