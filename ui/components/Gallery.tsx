"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { PawImage as PawImageComponent } from "./PawImage";
import { supabase } from "../lib/supabase";
import ONLYPAWS_ABI from "../lib/abi/OnlyPaws.json";
import { ONLYPAWS_CONTRACT_ADDRESS } from "../lib/constants";

interface PawImage {
  id: string;
  name: string;
  price: string;
  image_id: string;
  owner: string;
  image_url: string;
}

interface PawData {
  id: string;
  name: string;
  price: string;
  image_id: string;
  owner: string;
}

export function Gallery() {
  const { address } = useAccount();
  const [purchasedImages, setPurchasedImages] = useState<PawImage[]>([]);
  const [allPaws, setAllPaws] = useState<PawData[]>([]);

  // Fetch all paws first
  useEffect(() => {
    async function fetchAllPaws() {
      const { data, error } = await supabase.from("paws").select("*");
      if (!error && data) {
        setAllPaws(data as PawData[]);
      }
    }
    fetchAllPaws();
  }, []);

  // Use batch contract reading for ownership checks
  const { data: ownershipData } = useReadContracts({
    contracts: allPaws.map((paw) => ({
      address: ONLYPAWS_CONTRACT_ADDRESS,
      abi: ONLYPAWS_ABI as const,
      functionName: "userHasPaw",
      args: [address as `0x${string}`, BigInt(paw.id)],
    })),
  });

  console.log({ ownershipData });

  // Update purchased images when ownership data changes
  useEffect(() => {
    async function updatePurchasedImages() {
      if (!ownershipData || !allPaws.length) return;

      const ownedPaws = await Promise.all(
        allPaws
          .filter((_, index) => ownershipData[index]?.result)
          .map(async (paw) => {
            const { data: urlData } = supabase.storage
              .from("paw-images")
              .getPublicUrl(paw.image_id);

            return {
              ...paw,
              image_url: urlData.publicUrl,
            };
          })
      );

      setPurchasedImages(ownedPaws);
    }

    updatePurchasedImages();
  }, [ownershipData, allPaws]);

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
          <PawImageComponent
            key={image.id}
            image={image}
            purchased
            isInGallery={true}
          />
        ))}
      </div>
    </div>
  );
}
