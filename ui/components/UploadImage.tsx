"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import { ONLYPAWS_CONTRACT_ADDRESS, ONLYPAWS_ABI } from "../constants";
import { supabase } from "../lib/supabase";

export function UploadImage() {
  const [file, setFile] = useState<File | null>(null);
  const [price, setPrice] = useState("");
  const [uploading, setUploading] = useState(false);
  const { address } = useAccount();

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !price || !address) return;

    setUploading(true);

    try {
      // Upload image to Supabase
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("paw-images")
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("paw-images")
        .getPublicUrl(data.path);

      // Add paw image to contract
      const pawId = Date.now(); // Use timestamp as a simple unique ID
      writeContract({
        address: ONLYPAWS_CONTRACT_ADDRESS,
        abi: ONLYPAWS_ABI,
        functionName: "addPawImage",
        args: [BigInt(pawId), parseEther(price)],
      });

      console.log("before metadata", {
        id: pawId,
        name: file.name,
        price: price,
        image_url: publicUrlData.publicUrl,
        owner: address,
      });
      // Save metadata to Supabase
      const { error: metadataError } = await supabase
        .from("paw_images")
        .insert({
          id: pawId,
          name: file.name,
          price: price,
          image_url: publicUrlData.publicUrl,
          owner: address,
        });

      if (metadataError) throw metadataError;
      console.log("after metadata");

      setFile(null);
      setPrice("");
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setUploading(false);
    }
  };

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
        disabled={!file || !price || uploading || isConfirming}
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        {uploading || isConfirming ? "Uploading..." : "Upload Paw Image"}
      </button>
      {isConfirmed && (
        <p className="text-green-600">Paw image uploaded successfully!</p>
      )}
    </form>
  );
}
