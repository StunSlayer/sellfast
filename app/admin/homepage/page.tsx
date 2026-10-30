import { createClient } from "@/lib/supabase/server";
import { saveHomepageImage, removeHomepageImage } from "@/app/admin/actions";

type Props={searchParams:Promise<{saved?:string;removed?:string;error?:string}>};
const slotDetails=[
 {slot:"hero",title:"Homepage hero image",description:"Large banner behind the main Sellfast headline. Use a wide landscape image, ideally 2000 × 900 pixels or larger.",alt:"Sellfast luxury watch collection"},
 {slot:"sell_feature",title:"Sell / trade feature image",description:"Image beside the “Ready for a different wrist?” section. Use a landscape or square image.",alt:"Sellfast watch selling and trading"},
] as const;

export default async function AdminHomepagePage({searchParams}:Props){
 const p=await searchParams;
 const db=await createClient();
 const {data:rows}=await db.from("homepage_media").select("slot,storage_path,alt_text,updated_at");
 const media=Object.fromEntries((rows||[]).map(row=>[row.slot,row])) as Record<string,{slot:string;storage_path:string;alt_text:string|null;updated_at:string}>;
 const errorText=p.error==="file"?"Choose a JPEG, PNG or WebP image up to 10 MB.":p.error==="upload"?"The image could not be uploaded to Supabase Storage.":p.error==="save"?"The image settings could not be saved. Check that the homepage media migration has been applied.": "The requested change could not be completed.";
 return <>
  <div className="admin-heading"><div><div className="eyebrow">Storefront appearance</div><h1>Homepage images</h1><p>Replace the stock photographs used on the Sellfast landing page. Changes go live as soon as they are saved.</p></div></div>
  {p.error?<div className="notice error">{errorText}</div>:null}
  {p.saved?<div className="notice">Homepage image updated.</div>:null}
  {p.removed?<div className="notice">Custom homepage image removed. The original fallback image is now in use.</div>:null}
  <div className="homepage-media-grid">
   {slotDetails.map(item=>{
    const current=media.get(item.slot);
    const imageUrl=current?db.storage.from("site-media").getPublicUrl(current.storage_path).data.publicUrl:null;
    return <section className="panel homepage-media-card" key={item.slot}>
     <div className="eyebrow">Image slot · {item.slot==="hero"?"01":"02"}</div>
     <h2>{item.title}</h2>
     <p>{item.description}</p>
     {imageUrl?<div className="homepage-media-preview"><img src={imageUrl} alt={current?.alt_text||item.alt}/></div>:<div className="homepage-media-placeholder">Using the built-in Sellfast stock image</div>}
     <form action={saveHomepageImage} encType="multipart/form-data" className="homepage-media-form">
      <input type="hidden" name="slot" value={item.slot}/>
      <div className="form-field"><label htmlFor={item.slot+"-image"}>{current?"Replace image":"Upload image"}</label><input id={item.slot+"-image"} name="image" type="file" accept="image/jpeg,image/png,image/webp" required/><span className="muted" style={{fontSize:10}}>JPEG, PNG or WebP · maximum 10 MB.</span></div>
      <div className="form-field"><label htmlFor={item.slot+"-alt"}>Image description (alt text)</label><input id={item.slot+"-alt"} name="alt_text" maxLength={250} defaultValue={current?.alt_text||item.alt} required/></div>
      <button className="button" type="submit">{current?"Save replacement":"Upload image"}</button>
     </form>
     {current?<form action={removeHomepageImage} className="homepage-media-remove"><input type="hidden" name="slot" value={item.slot}/><button className="mini-button danger" type="submit">Remove custom image</button></form>:null}
     {current?.updated_at?<span className="muted" style={{fontSize:10}}>Last updated {new Date(current.updated_at).toLocaleString("en-AE")}</span>:null}
    </section>;
   })}
  </div>
 </>;
}
