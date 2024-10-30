"use client";

import { useState, useRef, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { parseEther } from "viem";
import ONLYPAWS_ABI from "../lib/abi/OnlyPaws.json";
import { ONLYPAWS_CONTRACT_ADDRESS } from "../lib/constants";
import { supabase } from "../lib/supabase";

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [price, setPrice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [pawId, setPawId] = useState<string | null>(null);
  const { address } = useAccount();
  const modalRef = useRef<HTMLDivElement>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Handle file selection and preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    }
  };

  // Handle contract transaction
  async function handleUpload() {
    if (!file || !price) return;

    try {
      const newPawId = Date.now().toString();
      setPawId(newPawId);

      // First, initiate contract transaction
      writeContract({
        address: ONLYPAWS_CONTRACT_ADDRESS,
        abi: ONLYPAWS_ABI,
        functionName: "addPawImage",
        args: [BigInt(newPawId), parseEther(price.toString())],
      });
    } catch (error) {
      console.error("Error with contract transaction:", error);
      setUploading(false);
    }
  }

  // Handle successful transaction confirmation
  useEffect(() => {
    const uploadToSupabase = async () => {
      if (!isConfirmed || !file || !price || !address || !pawId) return;

      setUploading(true);
      try {
        const fileId = `${pawId}-${file.name}`;

        // Upload image to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("paw-images")
          .upload(fileId, file);

        if (uploadError) throw uploadError;

        // Save metadata to Supabase
        const { error: metadataError } = await supabase.from("paws").insert({
          id: pawId,
          name: file.name,
          price: price,
          image_id: fileId,
          owner: address,
        });

        if (metadataError) throw metadataError;

        // Call onSuccess but don't close modal
        onSuccess();
        setIsSuccess(true);
      } catch (error) {
        console.error("Error uploading to Supabase:", error);
      } finally {
        setUploading(false);
      }
    };

    uploadToSupabase();
  }, [isConfirmed, file, price, address, pawId, onSuccess]);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
      <div
        ref={modalRef}
        className="bg-background/95 p-6 rounded-lg max-w-md w-full shadow-xl"
      >
        <h2 className="text-2xl font-bold mb-6 text-primary">Add New Paw</h2>

        {isSuccess ? (
          <div className="text-center mb-6">
            <div className="mb-4 text-green-500">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-text mb-4">
              Paw successfully uploaded!
            </p>
            <button
              onClick={onClose}
              className="bg-primary text-white py-2 px-4 rounded hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="border-2 border-dashed border-primary/50 rounded-lg p-8 text-center">
                {previewUrl ? (
                  <div className="mb-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="mx-auto rounded-lg max-w-full h-auto"
                      style={{ maxHeight: "200px" }}
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    <svg
                      className="mx-auto h-12 w-12 text-primary/50"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 14v20c0 4.418 3.582 8 8 8h16c4.418 0 8-3.582 8-8V14c0-4.418-3.582-8-8-8H16c-4.418 0-8 3.582-8 8zm4 0v20c0 2.209 1.791 4 4 4h16c2.209 0 4-1.791 4-4V14c0-2.209-1.791-4-4-4H16c-2.209 0-4 1.791-4 4z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 15l3-3 3 3M24 12v10M32 24l-3 3-3-3M24 27v-10"
                      />
                    </svg>
                  </div>
                )}
                <div className="flex text-sm text-text/80 justify-center">
                  <label className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80">
                    <span>{file ? "Change image" : "Upload a paw image"}</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-text/80 mb-2">
                Price (BERA)
              </label>
              <input
                type="number"
                step="0.1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-2 rounded border border-primary/20 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0.0"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleUpload}
                disabled={
                  !file || !price || uploading || isPending || isConfirming
                }
                className="flex-1 bg-primary text-white py-2 px-4 rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending || isConfirming
                  ? "Confirming..."
                  : uploading
                  ? "Uploading..."
                  : "Upload"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-secondary text-white py-2 px-4 rounded hover:bg-secondary/90 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
