"use client";

import { useAccount } from "wagmi";

export function Leaderboard() {
  const { address } = useAccount();

  // Mock data for leaderboard
  const leaderboard = [
    { address: "0x1234...5678", purchases: 10 },
    { address: "0x5678...9012", purchases: 8 },
    { address: "0x9012...3456", purchases: 6 },
    // Add more mock leaderboard entries here
  ];

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
        <button className="mt-6 bg-primary text-background px-6 py-2 rounded-full hover:bg-accent transition-colors">
          Claim BGT Rewards
        </button>
      )}
    </div>
  );
}
