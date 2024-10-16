"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { PawImage } from "./PawImage";
import { PurchaseModal } from "./PurchaseModal";
import { supabase } from "../lib/supabase";

interface PawImage {
  id: number;
  name: string;
  price: string;
  image_url: string;
}

export function Marketplace() {
  const [selectedImage, setSelectedImage] = useState<PawImage | null>(null);
  const [images, setImages] = useState<PawImage[]>([]);
  const { isConnected } = useAccount();

  useEffect(() => {
    fetchImages();
  }, []);

  async function fetchImages() {
    const { data, error } = await supabase
      .from("paw-images")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching images:", error);
    } else {
      setImages(data as PawImage[]);
    }
  }

  return (
    <div className="bg-background p-6 rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-6 text-primary">Available Paws</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <PawImage
            key={image.id}
            image={image}
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
