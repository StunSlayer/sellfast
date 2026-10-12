type Props = {
  action: (formData: FormData) => void | Promise<void>;
  post?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string[] | null;
    cover_image_url: string | null;
    seo_title: string | null;
    seo_description: string | null;
    canonical_url: string | null;
    status: string;
  };
  error?: string;
};

export function BlogPostForm({ action, post, error }: Props) {
  return <form action={action} className="admin-form blog-admin-form">
    {post ? <input type="hidden" name="id" value={post.id} /> : null}
    {error ? <div className="notice error">{error === "details" ? "Check the required fields, excerpt length, article length and canonical URL." : "The article could not be saved. Check whether the slug is already in use, then try again."}</div> : null}
    <div className="upload-help">
      Write original, genuinely useful articles. Use blank lines between paragraphs, <code>## Heading</code> for section headings, <code>### Subheading</code> for subheadings, and lines beginning with <code>- </code> for bullet lists. Slugs use lowercase words separated by hyphens.
    </div>
    <div className="form-grid">
      <div className="form-field span-all"><label htmlFor="blog-title">Article title *</label><input id="blog-title" name="title" required minLength={5} maxLength={180} defaultValue={post?.title || ""} placeholder="e.g. How to Buy a Pre-Owned Rolex in Dubai"/></div>
      <div className="form-field"><label htmlFor="blog-slug">URL slug</label><input id="blog-slug" name="slug" maxLength={180} defaultValue={post?.slug || ""} placeholder="Leave blank to generate from title"/><span className="muted" style={{fontSize:10}}>Public URL: /blog/your-slug</span></div>
      <div className="form-field"><label htmlFor="blog-category">Category *</label><input id="blog-category" name="category" required maxLength={80} defaultValue={post?.category || "Watch guides"} placeholder="Watch guides"/></div>
      <div className="form-field span-all"><label htmlFor="blog-excerpt">Excerpt *</label><textarea id="blog-excerpt" name="excerpt" required minLength={30} maxLength={320} defaultValue={post?.excerpt || ""} placeholder="A clear, specific summary that helps readers decide to click." style={{minHeight:90}}/></div>
      <div className="form-field span-all"><label htmlFor="blog-content">Article body *</label><textarea id="blog-content" name="content" required minLength={100} maxLength={50000} defaultValue={post?.content || ""} placeholder={"Write useful, original advice.\n\n## First section\n\nExplain the main point with specific details.\n\n## What buyers should check\n\nGive readers practical steps they can use."} style={{minHeight:380}}/></div>
      <div className="form-field span-all"><label htmlFor="blog-cover">Cover image URL</label><input id="blog-cover" name="cover_image_url" type="url" maxLength={1000} defaultValue={post?.cover_image_url || ""} placeholder="https://..."/></div>
      <div className="form-field"><label htmlFor="blog-seo-title">SEO title</label><input id="blog-seo-title" name="seo_title" maxLength={180} defaultValue={post?.seo_title || ""} placeholder="Optional, ideally around 50–60 characters"/></div>
      <div className="form-field"><label htmlFor="blog-seo-description">SEO description</label><textarea id="blog-seo-description" name="seo_description" maxLength={320} defaultValue={post?.seo_description || ""} placeholder="Optional search-result description" style={{minHeight:90}}/></div>
      <div className="form-field span-all"><label htmlFor="blog-tags">Tags</label><input id="blog-tags" name="tags" maxLength={1000} defaultValue={(post?.tags || []).join(", ")} placeholder="Rolex, buying guide, Dubai"/></div>
      <div className="form-field span-all"><label htmlFor="blog-canonical">Canonical URL (optional)</label><input id="blog-canonical" name="canonical_url" type="url" maxLength={500} defaultValue={post?.canonical_url || ""} placeholder="Leave blank to use this article's own URL"/><span className="muted" style={{fontSize:10}}>Only use this if the same article's main version lives at another HTTPS URL.</span></div>
      <div className="form-field"><label htmlFor="blog-status">Publication status</label><select id="blog-status" name="status" defaultValue={post?.status || "draft"}><option value="draft">Draft · not public</option><option value="published">Published · public and indexable</option><option value="archived">Archived · removed from public journal</option></select></div>
    </div>
    <div className="admin-form-footer"><button className="button" type="submit">{post ? "Save article" : "Create article"}</button><a className="button button-outline" href="/admin/blog">Cancel</a></div>
  </form>;
}
