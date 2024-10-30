"use client";

import { useAccount } from "wagmi";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { formatEther } from "viem";

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
  } = useLeaderboard();

  if (loading) return <p>Loading leaderboard...</p>;
  if (error) return <p>Error loading leaderboard: {error.message}</p>;

  const connectedUserIndex = leaderboard.findIndex(
    (entry) => entry.user.toLowerCase() === address?.toLowerCase()
  );

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-8 rounded-xl">
        <h2 className="text-3xl font-bold mb-4 text-primary">Top Collectors</h2>
        <p className="text-text/80 mb-6">
          Track the top paw collectors and their active BGT earning positions.
          Your paws automatically earn BGT rewards for 7 days after purchase.
          Check your position and claim your earned BGT rewards below.
        </p>
      </div>

      <div className="bg-background p-6 rounded-lg shadow-md">
        <div className="space-y-4">
          {leaderboard.map((entry, index) => {
            const isConnectedUser =
              entry.user.toLowerCase() === address?.toLowerCase();
            const displayIndex = isConnectedUser
              ? "You"
              : connectedUserIndex !== -1 && index > connectedUserIndex
              ? index
              : index + 1;

            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  isConnectedUser ? "bg-primary/20" : "bg-secondary/10"
                }`}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-2xl font-bold text-primary">
                    {displayIndex}
                  </span>
                  <div>
                    <p className="font-semibold text-text mb-2">
                      {entry.user.slice(0, 6)}...{entry.user.slice(-4)}
                    </p>
                    <p className="text-sm text-text/80">
                      <b>Amount Staked:</b> {entry.amount} PAWS
                    </p>
                  </div>
                </div>
                {isConnectedUser && (
                  <div className="flex flex-col items-end">
                    <p className="text-sm text-text/80">
                      Pending Rewards:{" "}
                      {earnedRewards
                        ? formatEther(earnedRewards as bigint)
                        : "0"}{" "}
                      BGT
                    </p>
                    <button
                      onClick={claimRewards}
                      disabled={
                        isClaimingRewards ||
                        !earnedRewards ||
                        earnedRewards === BigInt(0)
                      }
                      className="mt-2 bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isClaimingRewards
                        ? "Claiming..."
                        : isClaimConfirmed
                        ? "Claimed!"
                        : "Claim BGT"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
