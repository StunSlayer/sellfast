type BrandOption={id:string;name:string};
type Props={brands:BrandOption[];action:(formData:FormData)=>void|Promise<void>;submitLabel?:string;allowPublish?:boolean;showPublishToggle?:boolean;hidePhotoField?:boolean;defaults?:Record<string,string>};
export function ListingForm({brands,action,submitLabel="Save draft",allowPublish=false,showPublishToggle=true,hidePhotoField=false,defaults={}}:Props){
 const d=(key:string)=>defaults[key]||"";
 return <form action={action} encType="multipart/form-data" className="admin-form">
  <div className="upload-help">Add accurate listing details and clear photographs. Uploaded images stay private until an administrator publishes the listing. JPEG, PNG and WebP only, up to 10 MB per image.</div>
  <div className="form-grid">
   <div className="form-field"><label htmlFor="brand_id">Brand *</label><select name="brand_id" id="brand_id" required defaultValue={d("brand_id")}><option value="">Choose brand</option>{brands.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></div>
   <div className="form-field"><label htmlFor="model">Model *</label><input id="model" name="model" required maxLength={180} defaultValue={d("model")} placeholder="e.g. Submariner Date"/></div>
   <div className="form-field span-all"><label htmlFor="title">Listing title *</label><input id="title" name="title" required maxLength={180} defaultValue={d("title")} placeholder="e.g. Rolex Submariner Date 41mm"/></div>
   <div className="form-field"><label htmlFor="reference_number">Reference number</label><input id="reference_number" name="reference_number" maxLength={120} defaultValue={d("reference_number")}/></div>
   <div className="form-field"><label htmlFor="year">Year</label><input id="year" name="year" type="number" min="1900" max="2100" defaultValue={d("year")}/></div>
   <div className="form-field"><label htmlFor="price_aed">Price (AED)</label><input id="price_aed" name="price_aed" type="number" min="0" step="1" defaultValue={d("price_aed")} placeholder="Leave blank for price on request"/></div>
   <div className="form-field"><label htmlFor="condition">Condition *</label><select id="condition" name="condition" required defaultValue={d("condition")||"excellent"}><option value="new">New</option><option value="unworn">Unworn</option><option value="excellent">Excellent</option><option value="very_good">Very good</option><option value="good">Good</option><option value="fair">Fair</option></select></div>
   <div className="form-field"><label htmlFor="movement">Movement</label><input id="movement" name="movement" maxLength={100} defaultValue={d("movement")} placeholder="Automatic / manual / quartz"/></div>
   <div className="form-field"><label htmlFor="calibre">Calibre</label><input id="calibre" name="calibre" maxLength={100} defaultValue={d("calibre")}/></div>
   <div className="form-field"><label htmlFor="case_size_mm">Case size (mm)</label><input id="case_size_mm" name="case_size_mm" type="number" min="1" max="100" step=".1" defaultValue={d("case_size_mm")}/></div>
   <div className="form-field"><label htmlFor="case_material">Case material</label><input id="case_material" name="case_material" maxLength={100} defaultValue={d("case_material")}/></div>
   <div className="form-field"><label htmlFor="dial_color">Dial colour</label><input id="dial_color" name="dial_color" maxLength={100} defaultValue={d("dial_color")}/></div>
   <div className="form-field"><label htmlFor="bracelet_material">Bracelet / strap</label><input id="bracelet_material" name="bracelet_material" maxLength={100} defaultValue={d("bracelet_material")}/></div>
   <div className="form-field"><label htmlFor="warranty_info">Warranty details</label><input id="warranty_info" name="warranty_info" maxLength={250} defaultValue={d("warranty_info")}/></div>
   <div className="form-field span-all"><label htmlFor="description">Description</label><textarea id="description" name="description" maxLength={5000} defaultValue={d("description")} placeholder="Describe the watch clearly. Avoid claims that have not been verified."/></div>
   {!hidePhotoField?<div className="form-field span-all"><label htmlFor="photos">Watch photographs {allowPublish?"(add at least one before publishing)":"*"}</label><input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required={!allowPublish}/><span className="muted" style={{fontSize:10}}>The first photograph will be used as the cover unless you later reorder images.</span></div>:null}
  </div>
  <div className="inline-actions" style={{marginBottom:18}}>
   <label className="checkbox-row" style={{margin:0}}><input type="checkbox" name="box_included" value="true" defaultChecked={d("box_included")==="true"}/> Box included</label>
   <label className="checkbox-row" style={{margin:0}}><input type="checkbox" name="papers_included" value="true" defaultChecked={d("papers_included")==="true"}/> Original papers included</label>
   <label className="checkbox-row" style={{margin:0}}><input type="checkbox" name="price_on_request" value="true" defaultChecked={d("price_on_request")==="true"}/> Price on request</label>
  </div>
  {allowPublish&&showPublishToggle?<label className="checkbox-row"><input type="checkbox" name="publish_now" value="true"/> Publish after images upload successfully</label>:null}
  <div className="admin-form-footer"><button className="button" type="submit">{submitLabel}</button><a className="button button-outline" href="/admin/listings">Cancel</a></div>
 </form>
}
