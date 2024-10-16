"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { PawImage } from "./PawImage";
import { supabase } from "../lib/supabase";

interface PawImage {
  id: number;
  name: string;
  price: string;
  image_url: string;
}

export function Gallery() {
  const { address } = useAccount();
  const [purchasedImages, setPurchasedImages] = useState<PawImage[]>([]);

  useEffect(() => {
    if (address) {
      fetchPurchasedImages();
    }
  }, [address]);

  async function fetchPurchasedImages() {
    const { data: contractData, error: contractError } = await supabase.rpc(
      "get_user_paws",
      { user_address: address }
    );

    if (contractError) {
      console.error("Error fetching user paws:", contractError);
      return;
    }

    const pawIds = contractData.map((item: { paw_id: number }) => item.paw_id);

    const { data: imageData, error: imageError } = await supabase
      .from("paw-images")
      .select("*")
      .in("id", pawIds);

    if (imageError) {
      console.error("Error fetching purchased images:", imageError);
    } else {
      setPurchasedImages(imageData as PawImage[]);
    }
  }

  if (!address) {
    return (
      <div className="bg-background p-6 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold mb-6 text-primary">Your Gallery</h2>
        <p className="text-text">
          Connect your wallet to view your purchased images.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background p-6 rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-6 text-primary">Your Gallery</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {purchasedImages.map((image) => (
          <PawImage key={image.id} image={image} purchased />
        ))}
      </div>
    </div>
  );
}
