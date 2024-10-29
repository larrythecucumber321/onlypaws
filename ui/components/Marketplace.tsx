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
  image_id: string;
  owner: string;
  publicUrl?: string;
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
      const { data, error } = await supabase
        .from("paws")
        .select("id, name, image_id, price, owner")
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
              image_url: image.publicUrl || "",
            }}
            onClick={() => setSelectedImage(image)}
            isInGallery={false}
          />
        ))}
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
    </div>
  );
}
