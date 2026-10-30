"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

type DeleteAction = (formData: FormData) => void | Promise<void>;

type Props = {
  listingId: string;
  imageCount: number;
  action: DeleteAction;
};

export function DeleteListingButton({ listingId, imageCount, action }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={action} className="mini-form delete-listing-form">
      <input type="hidden" name="listing_id" value={listingId} />
      {confirming ? (
        <div className="delete-listing-confirm">
          <span>
            Permanently delete this watch and {imageCount} linked photo{imageCount === 1 ? "" : "s"}?
            Enquiries will remain in the inbox, but won't link to this listing.
          </span>
          <button className="mini-button danger" type="submit">Confirm delete</button>
          <button className="mini-button" type="button" onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      ) : (
        <button className="mini-button danger" type="button" onClick={() => setConfirming(true)}>
          <Trash2 size={12} /> Delete
        </button>
      )}
    </form>
  );
}
