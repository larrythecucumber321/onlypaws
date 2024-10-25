"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { ONLYPAWS_CONTRACT_ADDRESS, ONLYPAWS_ABI } from "../constants";
import { supabase } from "../lib/supabase";

interface PurchaseModalProps {
  image: {
    id: number;
    name: string;
    price: string;
  };
  onClose: () => void;
  onPurchase: () => void;
}

export function PurchaseModal({
  image,
  onClose,
  onPurchase,
}: PurchaseModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const { writeContract, data: hash } = useWriteContract();

  const { isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      await writeContract({
        address: "0x4b84b884C45790dceD4c224Da3D8eb9FF2B2c202", // Deployed contract address
        abi: ONLYPAWS_ABI,
        functionName: "purchasePaw",
        args: [BigInt(image.id)],
        value: parseEther(image.price),
      });
    } catch (error) {
      console.error("Error purchasing image:", error);
      setIsProcessing(false);
    }
  };

  const updatePurchaseStatus = async () => {
    const { error } = await supabase
      .from("paw-images")
      .update({ is_purchased: true })
      .eq("id", image.id);

    if (error) {
      console.error("Error updating purchase status:", error);
    } else {
      onPurchase();
    }
  };

  if (isSuccess) {
    updatePurchaseStatus();
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-background p-8 rounded-lg shadow-lg">
          <h3 className="text-2xl font-bold mb-4 text-primary">
            Purchase Successful!
          </h3>
          <p className="text-text">
            You have successfully purchased {image.name}.
          </p>
          <button
            className="mt-6 bg-primary text-background px-6 py-2 rounded-full hover:bg-accent transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-background p-8 rounded-lg shadow-lg">
        <h3 className="text-2xl font-bold mb-4 text-primary">
          Purchase {image.name}
        </h3>
        <p className="text-text">Price: {image.price} BERA</p>
        <button
          className="mt-6 bg-primary text-background px-6 py-2 rounded-full hover:bg-accent transition-colors"
          onClick={handlePurchase}
          disabled={isProcessing || isLoading}
        >
          {isProcessing || isLoading ? "Processing..." : "Confirm Purchase"}
        </button>
        <button
          className="mt-4 ml-4 bg-secondary text-background px-6 py-2 rounded-full hover:bg-accent transition-colors"
          onClick={onClose}
          disabled={isProcessing || isLoading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
