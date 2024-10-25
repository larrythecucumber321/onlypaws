"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { PawImage } from "./PawImage";
import { PurchaseModal } from "./PurchaseModal";
import { supabase } from "../lib/supabase";

interface PawImage {
  id: string;
  name: string;
  price: string;
  image_id: string; // Changed from image_url to image_id
  owner: string;
}

export function Marketplace() {
  const [selectedImage, setSelectedImage] = useState<PawImage | null>(null);
  const [images, setImages] = useState<PawImage[]>([]);
  const { isConnected } = useAccount();

  useEffect(() => {
    fetchImages();
  }, []);

  async function fetchImages() {
    try {
      // Fetch paw metadata from the paws table
      const { data, error } = await supabase
        .from("paws")
        .select("id, name, image_id, price, owner")
        .order("id", { ascending: false });

      if (error) throw error;

      if (data) {
        // For each paw, get the public URL of its image
        const pawsWithUrls = await Promise.all(
          data.map(async (paw) => {
            const { data: urlData } = supabase.storage
              .from("paw-images")
              .getPublicUrl(paw.image_id);

            console.log({ paw, urlData });
            return {
              ...paw,
              publicUrl: urlData.publicUrl,
            };
          })
        );

        setImages(pawsWithUrls);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  }

  if (images.length === 0) {
    return (
      <div className="bg-background p-6 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold mb-6 text-primary">Available Paws</h2>
        <p className="text-text">
          No paws available for purchase at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background p-6 rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-6 text-primary">Available Paws</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <PawImage
            key={image.id}
            image={{
              ...image,
              image_url: image.publicUrl, // Pass the public URL to PawImage
            }}
            onClick={() => setSelectedImage(image)}
          />
        ))}
      </div>
      {selectedImage && isConnected && (
        <PurchaseModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onPurchase={fetchImages}
        />
      )}
    </div>
  );
}
