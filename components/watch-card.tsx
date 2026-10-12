import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Listing } from "@/lib/marketplace";
import { conditionLabel, formatAED } from "@/lib/marketplace";

export function WatchCard({ listing, imageUrl }: { listing: Listing; imageUrl: string }) {
  const hasRealImage = (listing.listing_images || []).some((image) => image.storage_bucket === "watch-images");
  return (
    <article className="watch-card">
      <Link href={"/watches/" + listing.slug} className="watch-photo" aria-label={"View " + listing.title}>
        {hasRealImage && imageUrl ? (
          <img src={imageUrl} alt={listing.title + " luxury watch"} loading="lazy" />
        ) : (
          <div className="watch-placeholder" aria-label="Photographs available on request">
            <span>Sellfast</span>
            <strong>{listing.brand?.name || "Fine timepiece"}</strong>
            <small>Photography on request</small>
          </div>
        )}
        <span className="photo-badge">{conditionLabel(listing.condition)}</span>
      </Link>
      <div className="watch-info">
        <div className="watch-brand">{listing.brand?.name || "Fine timepiece"}</div>
        <Link href={"/watches/" + listing.slug} className="watch-title">{listing.title}</Link>
        <div className="watch-ref">{listing.reference_number ? "Ref. " + listing.reference_number : "Curated timepiece"}</div>
        <div className="watch-price-row">
          <span className="watch-price">{formatAED(listing.price_aed, listing.price_on_request)}</span>
          <Link href={"/watches/" + listing.slug} className="watch-arrow" aria-label={"View details for " + listing.title}><ArrowUpRight size={15} /></Link>
        </div>
      </div>
    </article>
  );
}
