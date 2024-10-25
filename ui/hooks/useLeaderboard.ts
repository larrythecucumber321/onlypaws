import { gql, useQuery } from "@apollo/client";
import {
  useAccount,
  useContractRead,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useMemo } from "react";
import { VAULT_CONTRACT_ADDRESS } from "../lib/constants";
import vaultABI from "../lib/abi/Vault.json";

type LeaderboardEntry = {
  id: string;
  totalStaked: string;
  totalWithdrawal: string;
  totalShares: string;
  totalStakedAmount: string;
  totalWithdrawalAmount: string;
  currentStakedAmount: string;
  endPrice: string;
  bera: string;
};

const LEADERBOARD_QUERY = gql`
  query GetLeaderboard($userId: String!) {
    users(orderBy: "currentStakedAmount", orderDirection: "desc", limit: 10) {
      items {
        id
        totalStaked
        totalWithdrawal
        totalStakedAmount
        totalWithdrawalAmount
        currentStakedAmount
        endPrice
        totalShares
        bera
      }
    }
    user(id: $userId) {
      id
      totalStaked
      totalWithdrawal
      totalStakedAmount
      totalWithdrawalAmount
      currentStakedAmount
      endPrice
      totalShares
      bera
    }
  }
`;

interface LeaderboardQueryResponse {
  users: {
    items: LeaderboardEntry[];
  };
  user: LeaderboardEntry;
}

export function useLeaderboard(vaultId: string) {
  const { address } = useAccount();
  const { data, loading, error } = useQuery<LeaderboardQueryResponse>(
    LEADERBOARD_QUERY,
    {
      variables: { vaultId, userId: address || "" },
      skip: !address,
    }
  );

  const { data: earnedRewards } = useContractRead({
    address: VAULT_CONTRACT_ADDRESS,
    abi: vaultABI.abi,
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

    const userEntry = data.user;
    const otherEntries = data.users.items.filter(
      (entry: LeaderboardEntry) =>
        entry.id.toLowerCase() !== address?.toLowerCase()
    );

    return userEntry ? [userEntry, ...otherEntries] : otherEntries;
  }, [data, address]);

  const claimRewards = () => {
    if (address) {
      console.log("Claiming rewards", address);
      writeContract({
        address: VAULT_CONTRACT_ADDRESS,
        abi: vaultABI.abi,
        functionName: "getReward",
        args: [address],
      });
    }
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
