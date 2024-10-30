"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { PawImage } from "./PawImage";
import Image from "next/image";
import { PurchaseModal } from "./PurchaseModal";
import { UploadModal } from "./UploadModal";
import { supabase } from "../lib/supabase";
import { usePawOwnership } from "../hooks/usePawOwnership";
import Link from "next/link";

interface PawImage {
  id: string;
  name: string;
  price: string;
  image_id: string;
  owner: string;
  publicUrl?: string;
  created_at: string;
}

type SortOption = "latest" | "price-asc" | "price-desc";

export function Marketplace() {
  const [selectedImage, setSelectedImage] = useState<PawImage | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [images, setImages] = useState<PawImage[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const { isConnected } = useAccount();
  const { ownedPaws, allPaws, isLoading } = usePawOwnership();

  const availablePaws = allPaws.filter(
    (paw) => !ownedPaws.find((owned) => owned.id === paw.id)
  );

  useEffect(() => {
    fetchImages();
  }, []);

  async function fetchImages() {
    try {
      const { data, error } = await supabase
        .from("paws")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      if (data) {
        const pawsWithUrls = await Promise.all(
          data.map(async (paw) => {
            const { data: urlData } = supabase.storage
              .from("paw-images")
              .getPublicUrl(paw.image_id);

            return {
              ...paw,
              publicUrl: urlData.publicUrl,
            };
          })
        );

        console.log(pawsWithUrls);

        setImages(pawsWithUrls);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  }

  const sortedImages = [...images].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return parseFloat(a.price) - parseFloat(b.price);
      case "price-desc":
        return parseFloat(b.price) - parseFloat(a.price);
      case "latest":
      default:
        return new Date(b.id).getTime() - new Date(a.id).getTime();
    }
  });

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-8 rounded-xl text-center">
        <div className="flex items-center justify-center">
          <h1 className="relative text-4xl font-bold text-primary mb-4">
            Welcome to OnlyPaws
          </h1>
          <div className="relative w-16 h-16">
            <Image
              src="/logo.png"
              alt="OnlyPaws Logo"
              width={100}
              height={100}
              style={{ paddingTop: "5px", objectFit: "contain" }}
              priority
            />
          </div>
        </div>
        <p className="text-text/80 mb-6 max-w-2xl mx-auto">
          Discover and collect unique paws. Each purchase activates a 7-day BGT
          reward stream through Berachain's Proof-of-Liquidity mechanism.
        </p>
        <div className="bg-background/30 p-6 rounded-lg mb-6 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-3 text-primary">
            How BGT Rewards Work
          </h3>
          <ul className="text-left space-y-2 text-text/80">
            <li>• Purchase a paw to start earning BGT rewards</li>
            <li>
              • Your paw automatically stakes in the RewardsVault for 7 days
            </li>
            <li>• Earn BGT rewards proportional to your stake</li>
            <li>
              • Track your earnings and claim rewards in the{" "}
              <Link
                href="/leaderboard"
                className="text-primary hover:text-primary/80 underline"
              >
                Leaderboard
              </Link>
            </li>
          </ul>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-primary text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
        >
          Show off Your Paw
        </button>
      </div>

      {/* Marketplace Section */}
      <div className="bg-background p-8 rounded-xl shadow-lg border border-primary/10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-primary">Available Paws</h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2 rounded-lg bg-background border border-primary/20 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="latest">Latest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        {availablePaws.length === 0 ? (
          <div className="text-center py-12 bg-background/50 rounded-lg border-2 border-dashed border-primary/20">
            <p className="text-text text-lg mb-4">
              No paws available for purchase at the moment.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-primary hover:text-primary/80 font-semibold"
            >
              Be the first to add a paw!
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availablePaws.map((image) => (
              <PawImage
                key={image.id}
                image={{
                  ...image,
                  image_url: image.publicUrl || "",
                }}
                onClick={() => setSelectedImage(image)}
                isInGallery={false}
              />
            ))}
          </div>
        )}
      </div>

      {selectedImage && isConnected && (
        <PurchaseModal
          image={{
            id: Number(selectedImage.id),
            name: selectedImage.name,
            price: selectedImage.price,
          }}
          onClose={() => setSelectedImage(null)}
          onPurchase={fetchImages}
        />
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={fetchImages}
        />
      )}
    </div>
  );
}
