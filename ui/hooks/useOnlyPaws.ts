import { useReadContract } from "wagmi";
import ONLYPAWS_ABI from "../lib/abi/OnlyPaws.json";
import { ONLYPAWS_CONTRACT_ADDRESS } from "../lib/constants";

export function useGetActiveStakes() {
  return useReadContract({
    address: ONLYPAWS_CONTRACT_ADDRESS,
    abi: ONLYPAWS_ABI,
    functionName: "getActiveStakes",
  });
}

export function useUserHasPaw(userAddress: `0x${string}`, pawId: number) {
  return useReadContract({
    address: ONLYPAWS_CONTRACT_ADDRESS,
    abi: ONLYPAWS_ABI,
    functionName: "userHasPaw",
    args: [userAddress, BigInt(pawId)],
  });
}
