import { useAccount, useReadContracts } from "wagmi";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ONLYPAWS_ABI from "../lib/abi/OnlyPaws.json";
import { ONLYPAWS_CONTRACT_ADDRESS } from "../lib/constants";

interface PawData {
  id: string;
  name: string;
  price: string;
  image_id: string;
  owner: string;
  publicUrl?: string;
}

export function usePawOwnership() {
  const { address } = useAccount();
  const [allPaws, setAllPaws] = useState<PawData[]>([]);
  const [ownedPaws, setOwnedPaws] = useState<PawData[]>([]);

  const { data: ownershipData } = useReadContracts({
    contracts: allPaws.map((paw) => ({
      address: ONLYPAWS_CONTRACT_ADDRESS,
      abi: ONLYPAWS_ABI,
      functionName: "userHasPaw",
      args: [address as `0x${string}`, BigInt(paw.id)],
    })),
  });

  useEffect(() => {
    async function fetchAllPaws() {
      const { data, error } = await supabase.from("paws").select("*");
      if (!error && data) {
        const pawsWithUrls = await Promise.all(
          data.map(async (paw) => {
            const { data: urlData } = supabase.storage
              .from("paw-images")
              .getPublicUrl(paw.image_id);
            return { ...paw, publicUrl: urlData.publicUrl };
          })
        );
        setAllPaws(pawsWithUrls);
      }
    }
    fetchAllPaws();
  }, []);

  useEffect(() => {
    if (!ownershipData || !allPaws.length) return;

    const owned = allPaws.filter((_, index) => ownershipData[index]?.result);
    setOwnedPaws(owned);
  }, [ownershipData, allPaws]);

  return {
    allPaws,
    ownedPaws,
    isLoading: !ownershipData,
  };
}
