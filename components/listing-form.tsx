"use client";

import { useState } from "react";
type BrandOption={id:string;name:string};
type Props={brands:BrandOption[];action:(formData:FormData)=>void|Promise<void>;submitLabel?:string;allowPublish?:boolean;showPublishToggle?:boolean;hidePhotoField?:boolean;defaults?:Record<string,string>;serverError?:string};
export function ListingForm({brands,action,submitLabel="Save draft",allowPublish=false,showPublishToggle=true,hidePhotoField=false,defaults={},serverError}:Props){
 const d=(key:string)=>defaults[key]||"";
 const savedMovement=d("movement");
 const movementKey=savedMovement.trim().toLowerCase();
 const normalizedMovement=movementKey==="manual winding"||movementKey==="hand wound"||movementKey==="hand-wound"?"manual":movementKey;
 const movementChoice=["automatic","manual","quartz","unknown"].includes(normalizedMovement)?normalizedMovement:(savedMovement?"other":"unknown");
 const movementOther=movementChoice==="other"?savedMovement:d("movement_other");
 const initialYearStatus=d("year_status")|| (d("year")?"known":"unknown");
 const [yearStatus,setYearStatus]=useState(initialYearStatus);
 const initialSetContents=d("set_contents")||"unknown";
 const [setContents,setSetContents]=useState(initialSetContents);
 const [movementChoiceState,setMovementChoiceState]=useState(movementChoice);
 const [priceOnRequest,setPriceOnRequest]=useState(d("price_on_request")==="true");
 const [validationAttempted,setValidationAttempted]=useState(serverError==="details");
 return <form action={action} encType="multipart/form-data" className={"admin-form"+(validationAttempted?" validation-attempted":"")} onInvalidCapture={()=>setValidationAttempted(true)}>
  <div className="upload-help">Add accurate listing details and clear photographs. Uploaded images stay private until an administrator publishes the listing. JPEG, PNG and WebP only, up to 10 MB per image.</div>
  {validationAttempted?<p className="validation-guidance" role="status">Please complete the fields highlighted in red. A price is required unless you select “Price on request”.</p>:null}
  <div className="form-grid">
   <div className="form-field"><label htmlFor="brand_id">Brand *</label><select name="brand_id" id="brand_id" required defaultValue={d("brand_id")}><option value="">Choose brand</option>{brands.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></div>
   <div className="form-field"><label htmlFor="model">Model *</label><input id="model" name="model" required maxLength={180} defaultValue={d("model")} placeholder="e.g. Submariner Date"/></div>
   <div className="form-field span-all"><label htmlFor="title">Listing title *</label><input id="title" name="title" required minLength={3} maxLength={180} defaultValue={d("title")} placeholder="e.g. Rolex Submariner Date 41mm"/></div>
   <div className="form-field"><label htmlFor="reference_number">Reference number</label><input id="reference_number" name="reference_number" maxLength={120} defaultValue={d("reference_number")}/></div>
   <div className="form-field"><label htmlFor="year_status">Year status *</label><select id="year_status" name="year_status" required value={yearStatus} onChange={e=>setYearStatus(e.target.value)}><option value="known">Known year</option><option value="unknown">Unknown year</option><option value="not_applicable">Not applicable</option></select><span className="muted" style={{fontSize:10}}>Choose known only when the production year is supported by reliable information.</span></div>
   <div className="form-field"><label htmlFor="year">Year (if known)</label><input id="year" name="year" type="number" min="1900" max="2100" defaultValue={yearStatus==="known"?d("year"):""} required={yearStatus==="known"} placeholder="e.g. 2018"/><span className="muted" style={{fontSize:10}}>Ignored when year status is Unknown or Not applicable.</span></div>
   <div className="form-field"><label htmlFor="price_aed">Price (AED) {!priceOnRequest?"*":""}</label><input id="price_aed" name="price_aed" type="number" min="0" step="1" required={!priceOnRequest} defaultValue={d("price_aed")} placeholder="Leave blank for price on request"/></div>
   <div className="form-field"><label htmlFor="condition">Condition *</label><select id="condition" name="condition" required defaultValue={d("condition")||"excellent"}><option value="new">New</option><option value="unworn">Unworn</option><option value="excellent">Excellent</option><option value="very_good">Very good</option><option value="good">Good</option><option value="fair">Fair</option></select></div>
   <div className="form-field"><label htmlFor="movement">Movement</label><select id="movement" name="movement" value={movementChoiceState} onChange={e=>setMovementChoiceState(e.target.value)}><option value="unknown">Unknown</option><option value="automatic">Automatic</option><option value="manual">Manual winding</option><option value="quartz">Quartz</option><option value="other">Other</option></select></div>
   <div className="form-field"><label htmlFor="movement_other">Other movement details {movementChoiceState==="other"?"*":""}</label><input id="movement_other" name="movement_other" maxLength={100} required={movementChoiceState==="other"} defaultValue={movementOther} placeholder="Enter movement if Other"/><span className="muted" style={{fontSize:10}}>Only used when Movement is set to Other.</span></div>
   <div className="form-field"><label htmlFor="calibre">Calibre</label><input id="calibre" name="calibre" maxLength={100} defaultValue={d("calibre")}/></div>
   <div className="form-field"><label htmlFor="case_size_mm">Case size (mm)</label><input id="case_size_mm" name="case_size_mm" type="number" min="1" max="100" step=".1" defaultValue={d("case_size_mm")}/></div>
   <div className="form-field"><label htmlFor="case_material">Case material</label><input id="case_material" name="case_material" maxLength={100} defaultValue={d("case_material")}/></div>
   <div className="form-field"><label htmlFor="dial_color">Dial colour</label><input id="dial_color" name="dial_color" maxLength={100} defaultValue={d("dial_color")}/></div>
   <div className="form-field"><label htmlFor="bracelet_material">Bracelet / strap</label><input id="bracelet_material" name="bracelet_material" maxLength={100} defaultValue={d("bracelet_material")}/></div>
   <div className="form-field"><label htmlFor="warranty_info">Warranty details</label><input id="warranty_info" name="warranty_info" maxLength={250} defaultValue={d("warranty_info")}/></div>
   <div className="form-field span-all"><label htmlFor="description">Description</label><textarea id="description" name="description" maxLength={5000} defaultValue={d("description")} placeholder="Describe the watch clearly. Avoid claims that have not been verified."/></div>
   {!hidePhotoField?<div className="form-field span-all"><label htmlFor="photos">Watch photographs {allowPublish?"(add at least one before publishing)":"*"}</label><input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required={!allowPublish}/><span className="muted" style={{fontSize:10}}>The first photograph will be used as the cover unless you later reorder images.</span></div>:null}
  </div>
  <div className="form-grid">
   <div className="form-field"><label htmlFor="set_contents">Set contents *</label><select id="set_contents" name="set_contents" required value={setContents} onChange={e=>setSetContents(e.target.value)}>
    <option value="unknown">Unknown / not confirmed</option>
    <option value="watch_only">Watch only (naked watch)</option>
    <option value="full_set">Full set (box and papers)</option>
    <option value="box_only">Box only</option>
    <option value="papers_only">Papers only</option>
    <option value="other">Other</option>
   </select><span className="muted" style={{fontSize:10}}>Choose Watch only when the watch is supplied without box or papers.</span></div>
   <div className="form-field"><label htmlFor="set_contents_notes">Set contents notes {setContents==="other"?"*":""}</label><input id="set_contents_notes" name="set_contents_notes" maxLength={250} required={setContents==="other"} defaultValue={d("set_contents_notes")} placeholder="Describe other included items"/></div>
  </div>
  <div className="inline-actions" style={{marginBottom:18}}>
   <label className="checkbox-row" style={{margin:0}}><input type="checkbox" name="price_on_request" value="true" checked={priceOnRequest} onChange={e=>setPriceOnRequest(e.target.checked)}/> Price on request</label>
  </div>
  {allowPublish&&showPublishToggle?<label className="checkbox-row"><input type="checkbox" name="publish_now" value="true"/> Publish after images upload successfully</label>:null}
  <div className="admin-form-footer"><button className="button" type="submit">{submitLabel}</button><a className="button button-outline" href="/admin/listings">Cancel</a></div>
 </form>
}
