"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { PawImage as PawImageComponent } from "./PawImage";
import { ImageModal } from "./ImageModal";
import { usePawOwnership } from "../hooks/usePawOwnership";
import Link from "next/link";

interface ExpandedImage {
  url: string;
  id: string;
}

export function Gallery() {
  const { address } = useAccount();
  const { ownedPaws, isLoading } = usePawOwnership();
  const [expandedImage, setExpandedImage] = useState<ExpandedImage | null>(
    null
  );

  if (!address) {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-8 rounded-xl text-center">
        <h2 className="text-4xl font-bold mb-6 text-primary">Your Gallery</h2>
        <p className="text-text/80">
          Connect your wallet to view your purchased paws.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-8 rounded-xl text-center">
        <p className="text-text/80">Loading your collection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-8 rounded-xl">
        <h2 className="text-4xl font-bold mb-4 text-primary">Paws Gallery</h2>
        <p className="text-text/80 mb-6">
          Browse your collection of unique paws
        </p>
      </div>

      <div className="bg-background p-8 rounded-xl shadow-lg border border-primary/10">
        {ownedPaws.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text/80 mb-4 font-bold">Your gallery is empty</p>
            <Link
              href="/marketplace"
              className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Purchase Your First Paw
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedPaws.map((image) => (
              <div
                key={image.id}
                className="cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() =>
                  setExpandedImage({
                    url: image.publicUrl || "",
                    id: image.id,
                  })
                }
              >
                <PawImageComponent
                  image={{
                    ...image,
                    image_url: image.publicUrl || "",
                  }}
                  purchased
                  isInGallery={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {expandedImage && (
        <ImageModal
          imageUrl={expandedImage.url}
          onClose={() => setExpandedImage(null)}
        />
      )}
    </div>
  );
}
