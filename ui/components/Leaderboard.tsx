"use client";

import { useAccount } from "wagmi";
import { useLeaderboard } from "../hooks/useLeaderboard";

export function Leaderboard() {
  const { address } = useAccount();
  const {
    leaderboard,
    loading,
    error,
    earnedRewards,
    claimRewards,
    isClaimingRewards,
    isClaimConfirmed,
  } = useLeaderboard("vaultId"); // Replace with actual vault ID

  return (
    <div className="bg-background p-6 rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-6 text-primary">Leaderboard</h2>
      <ul className="space-y-4">
        {leaderboard.map((entry, index) => (
          <li
            key={index}
            className="flex justify-between items-center border-b border-accent pb-2"
          >
            <span className="text-text">{entry.address}</span>
            <span className="text-primary font-bold">
              {entry.purchases} purchases
            </span>
          </li>
        ))}
      </ul>
      {address && (
        <button
          className="mt-6 bg-primary text-background px-6 py-2 rounded-full hover:bg-accent transition-colors"
          onClick={claimRewards}
          disabled={isClaimingRewards}
        >
          {isClaimingRewards ? "Claiming..." : "Claim BGT Rewards"}
        </button>
      )}
    </div>
  );
}
