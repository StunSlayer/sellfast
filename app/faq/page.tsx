import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const metadata:Metadata={title:"Frequently Asked Questions",description:"Answers about watch listings, enquiries, selling, trading and seller approval on Sellfast."};
const faqs=[
{q:"Can I buy a watch directly through the website?",a:"The initial Sellfast experience is enquiry-led. Use the listing form or WhatsApp to ask about availability, request additional details and agree the next steps with the team. Online checkout is not enabled."},
{q:"Are all listed watches available?",a:"The catalogue shows listings marked available, but availability can change. Please confirm status with the concierge before making plans or payment."},
{q:"Does a published listing guarantee authenticity?",a:"Publication means a listing passed the Sellfast moderation workflow. It is not, by itself, a guarantee of authenticity. Inspection, supporting documentation and transaction terms should be confirmed before purchase."},
{q:"How do I sell or trade my watch?",a:"Share the brand, model, reference, condition, set contents and your contact details on the Sell / Trade page. The team will review the information and follow up. An enquiry is not a binding purchase offer."},
{q:"Can I list watches as a dealer?",a:"Create an account and submit a seller application. Once approved, you can submit watch listings for individual review. Approval as a seller does not automatically publish submitted watches."},
{q:"Can I reserve a watch online?",a:"No online reservation or payment is available in the initial release. Contact the concierge to discuss availability and the process for a specific timepiece."},
{q:"What should I include in an enquiry?",a:"Include a reference number if available, your preferred contact method and the questions you need answered. For selling, mention condition, year, box and papers and service history."}
];
export default function FAQPage(){return <><SiteHeader/><main><section className="page-hero"><div className="container"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>FAQ</span></div><div className="eyebrow">Useful details</div><h1 className="display">Questions, clearly answered.</h1><p>Our initial process is built around live listings and a personal concierge, with no online checkout at this stage.</p></div></section><section className="container section"><div className="faq-list">{faqs.map(f=><article className="faq-item" key={f.q}><h3>{f.q}</h3><p>{f.a}</p></article>)}</div><div style={{marginTop:28}}><Link className="button" href="/contact">Still have a question? <ArrowRight size={14}/></Link></div></section></main><SiteFooter/></>}
