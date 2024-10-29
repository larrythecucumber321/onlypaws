"use client";

import { gql, useQuery } from "@apollo/client";
import {
  useAccount,
  useContractRead,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useMemo } from "react";
import {
  ONLYPAWS_CONTRACT_ADDRESS,
  VAULT_CONTRACT_ADDRESS,
} from "../lib/constants";
import ONLYPAWS_ABI from "../lib/abi/OnlyPaws.json";
import VAULT_ABI from "../lib/abi/Vault.json";

type LeaderboardEntry = {
  id: string;
  user: string;
  amount: string;
  vault: {
    id: string;
    vaultAddress: string;
  };
};

const LEADERBOARD_QUERY = gql`
  query GetLeaderboard($vaultId: String!, $userId: String!) {
    topTen: userVaultDeposits_collection(
      where: { vault_: { id: $vaultId } }
      first: 10
      orderBy: amount
      orderDirection: desc
    ) {
      id
      user
      amount
      vault {
        id
        vaultAddress
      }
    }
    specificUser: userVaultDeposits_collection(
      where: { and: [{ vault_: { id: $vaultId } }, { user: $userId }] }
      first: 1
    ) {
      id
      user
      amount
      vault {
        id
        vaultAddress
      }
    }
  }
`;

interface LeaderboardQueryResponse {
  topTen: LeaderboardEntry[];
  specificUser: LeaderboardEntry[];
}

export function useLeaderboard() {
  const { address } = useAccount();
  const { data, loading, error } = useQuery<LeaderboardQueryResponse>(
    LEADERBOARD_QUERY,
    {
      variables: { vaultId: VAULT_CONTRACT_ADDRESS, userId: address || "" },
      skip: !address,
    }
  );

  const { data: earnedRewards } = useContractRead({
    address: VAULT_CONTRACT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "earned",
    args: [address],
  });

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isClaimingRewards, isSuccess: isClaimConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const sortedLeaderboard = useMemo(() => {
    if (!data) return [];

    const userEntry = data.specificUser[0];
    const otherEntries = data.topTen.filter(
      (entry) => entry.user.toLowerCase() !== address?.toLowerCase()
    );

    return userEntry ? [userEntry, ...otherEntries] : otherEntries;
  }, [data, address]);

  const claimRewards = () => {
    if (!address) return;

    writeContract({
      address: ONLYPAWS_CONTRACT_ADDRESS,
      abi: ONLYPAWS_ABI,
      functionName: "claimRewards",
      args: [address],
    });
  };

  return {
    leaderboard: sortedLeaderboard,
    loading,
    error,
    earnedRewards,
    claimRewards,
    isClaimingRewards,
    isClaimConfirmed,
  };
}
