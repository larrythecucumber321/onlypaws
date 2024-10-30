"use client";

import { useAccount } from "wagmi";
import { PawImage as PawImageComponent } from "./PawImage";
import { usePawOwnership } from "../hooks/usePawOwnership";
import Link from "next/link";

export function Gallery() {
  const { address } = useAccount();
  const { ownedPaws, isLoading } = usePawOwnership();

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
        <h2 className="text-4xl font-bold mb-4 text-primary">Your Gallery</h2>
        <p className="text-text/80 mb-6">
          Your collected paws are actively earning BGT rewards. Each paw earns
          rewards for 7 days after purchase.
        </p>
      </div>

      <div className="bg-background p-8 rounded-xl shadow-lg border border-primary/10">
        {ownedPaws.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text/80 mb-4">Your gallery is empty.</p>
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
              <PawImageComponent
                key={image.id}
                image={{
                  ...image,
                  image_url: image.publicUrl || "",
                }}
                purchased
                isInGallery={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
