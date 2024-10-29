"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useWriteContract } from "wagmi";
import ONLYPAWS_ABI from "../lib/abi/OnlyPaws.json";
import { ONLYPAWS_CONTRACT_ADDRESS } from "../lib/constants";

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
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        if (showSuccess) {
          handleViewGallery();
        } else {
          onClose();
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSuccess]);

  const { writeContract } = useWriteContract({
    mutation: {
      onSuccess: () => {
        setShowSuccess(true);
        onPurchase();
      },
      onError: (error) => {
        console.error("Error purchasing paw:", error);
      },
    },
  });

  function handlePurchase() {
    writeContract({
      address: ONLYPAWS_CONTRACT_ADDRESS,
      abi: ONLYPAWS_ABI,
      functionName: "purchasePaw",
      args: [BigInt(image.id)],
      value: parseEther(image.price),
    });
  }

  function handleViewGallery() {
    onClose();
    router.push("/gallery");
  }

  if (showSuccess) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
        <div
          ref={modalRef}
          className="bg-background/95 p-6 rounded-lg max-w-md w-full shadow-xl"
        >
          <h2 className="text-2xl font-bold mb-4 text-primary">
            Purchase Successful!
          </h2>
          <p className="text-text mb-6">
            You have successfully purchased a paw! View it in your Gallery.
          </p>
          <button
            onClick={handleViewGallery}
            className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-primary/90 transition-colors"
          >
            View Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
      <div
        ref={modalRef}
        className="bg-background/95 p-6 rounded-lg max-w-md w-full shadow-xl"
      >
        <h2 className="text-2xl font-bold mb-4 text-primary">
          Confirm Purchase
        </h2>
        <p className="text-text mb-6">
          Are you sure you want to purchase this paw for {image.price} BERA?
        </p>
        <div className="flex gap-4">
          <button
            onClick={handlePurchase}
            className="flex-1 bg-primary text-white py-2 px-4 rounded hover:bg-primary/90 transition-colors"
          >
            Purchase
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-secondary text-white py-2 px-4 rounded hover:bg-secondary/90 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
