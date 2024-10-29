"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { parseEther } from "viem";
import ONLYPAWS_ABI from "../lib/abi/OnlyPaws.json";
import { supabase } from "../lib/supabase";

export function UploadImage() {
  const [file, setFile] = useState<File | null>(null);
  const [price, setPrice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const { address } = useAccount();

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }
      const file = e.target.files[0];
      setFile(file);

      // Create a local preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Error handling file:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !price || !address) return;

    setUploading(true);

    try {
      const pawId = Date.now();

      // First, write to the contract
      await writeContract({
        address: "0x4b84b884C45790dceD4c224Da3D8eb9FF2B2c202",
        abi: ONLYPAWS_ABI,
        functionName: "addPawImage",
        args: [BigInt(pawId), parseEther(price)],
      });

      // Wait for transaction confirmation using the useWaitForTransactionReceipt hook
      // The actual waiting is handled by the hook, and we use isConfirmed in a useEffect
    } catch (error) {
      console.error("Error with contract transaction:", error);
      setUploading(false);
    }
  };

  // Handle successful transaction confirmation
  useEffect(() => {
    const uploadToSupabase = async () => {
      if (!isConfirmed || !file || !price || !address) return;

      try {
        const fileId = `${Date.now()}-${file.name}`;
        const pawId = Date.now();

        // Upload to Supabase storage bucket
        const { error: uploadError } = await supabase.storage
          .from("paw-images")
          .upload(fileId, file);

        if (uploadError) throw uploadError;

        // Save metadata to Supabase
        const { error: metadataError } = await supabase.from("paws").insert({
          id: pawId.toString(),
          name: file.name,
          price: price,
          image_id: fileId,
          owner: address,
        });

        if (metadataError) throw metadataError;

        // Reset form
        setFile(null);
        setPrice("");
        setPreviewUrl("");
      } catch (error) {
        console.error("Error uploading to Supabase:", error);
      } finally {
        setUploading(false);
      }
    };

    uploadToSupabase();
  }, [isConfirmed, file, price, address]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="file"
          className="block text-sm font-medium text-gray-700"
        >
          Paw Image
        </label>
        <input
          type="file"
          id="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-primary file:text-white
            hover:file:bg-accent"
        />
      </div>
      {previewUrl && (
        <div className="mt-4">
          <img
            src={previewUrl}
            alt="Preview"
            className="rounded-lg w-[300px] h-[300px] object-cover"
          />
        </div>
      )}
      <div>
        <label
          htmlFor="price"
          className="block text-sm font-medium text-gray-700"
        >
          Price (BERA)
        </label>
        <input
          type="number"
          id="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
        />
      </div>
      <button
        type="submit"
        disabled={!file || !price || uploading || isPending || isConfirming}
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        {isPending || isConfirming
          ? "Confirming Transaction..."
          : uploading
          ? "Uploading..."
          : "Upload Paw Image"}
      </button>
    </form>
  );
}
