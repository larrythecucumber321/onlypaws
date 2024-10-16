# OnlyPaws Project Specification

## Overview

OnlyPaws is a parody application inspired by apps for selling feet pictures. Instead of feet, it focuses on selling pictures of bear paws. Initially, the site will feature pre-uploaded, AI-generated images, with plans to allow user uploads in the future. The application will leverage a similar tech stack to POLTech, incorporating blockchain elements for transactions and rewards.

## Technical Requirements

### Frontend

- **Framework**: Use Next.js for server-side rendering and React for building the user interface.
- **Styling**: Utilize Tailwind CSS for styling components.
- **Wallet Integration**: Implement RainbowKit for Ethereum wallet connection and transaction handling.
- **State Management**: Use React Query for data fetching and state management.

### Backend

- **Smart Contracts**:

  - Develop a smart contract to handle the purchase of bear paw images.
  - Implement logic to allow users to earn BGT rewards for a limited time after purchase.
  - Ensure the contract supports querying purchased items based on wallet address.

- **Database**:
  - Use Supabase for storing user data and metadata about the images.
  - Store information about purchases, user profiles, and leaderboard data.

### Views

1. **Marketplace View**:

   - Display all available bear paw images with high-level information (price, source name).
   - Obscure images to ensure full quality is accessible only after purchase.
   - Implement a modal for purchasing images, triggering an on-chain transaction.

2. **Gallery View**:

   - Show users the bear paw images they have purchased.
   - Filter images based on the connected wallet.

3. **Leaderboard View**:
   - Display a leaderboard of users who have purchased the most images.
   - Allow users to claim BGT rewards if they have made purchases.

### Smart Contract Logic

- **Purchase Logic**:

  - Users can purchase images through an on-chain transaction.
  - Store purchase data on-chain to verify ownership.

- **Rewards Logic**:

  - Implement a mechanism to distribute BGT rewards for a limited time after purchase.
  - Ensure rewards are not distributed indefinitely to prevent unfair advantages for early users.

- **Tests**: Implement tests for the smart contract to ensure functionality and security.

### Additional Features

- **User Uploads**: Plan for future functionality to allow users to upload their own bear paw images.
- **Security**: Ensure all transactions and data handling are secure and follow best practices.

## Current File Structure

ONLYPAWS
├── .git
├── contracts
│ ├── lib
│ ├── script
│ │ └── Counter.s.sol
│ ├── src
│ │ └── Counter.sol
│ └── test
│ └── Counter.t.sol
├── foundry.toml
├── README.md
├── requirements
│ ├── Integration.t.sol
│ ├── requirements.md
│ └── RewardsVaultIntegration.t.sol
├── ui
│ ├── app
│ │ ├── fonts
│ │ ├── favicon.ico
│ │ ├── globals.css
│ │ ├── layout.tsx
│ │ └── page.tsx
│ └── lib
│ └── utils.ts
├── node_modules
├── .eslintrc.json
├── .gitignore
├── components.json
├── next-env.d.ts
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── README.md
├── tailwind.config.ts
├── tsconfig.json
└── yarn.lock

## Rules

All UI code should go into the `ui` folder.
All contract code should go into the `contracts` folder.

## Conclusion

This document outlines the technical and business requirements for the OnlyPaws project. The goal is to create a unique and engaging platform that leverages blockchain technology for secure transactions and rewards, while providing a fun and novel user experience.

## Resources

### web3-provider.tsx for RainbowKit, based on Berachain network settings:

```tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { http } from "wagmi";

const berachainTestnet = {
  id: 80084,
  name: "Berachain Testnet",
  network: "berachain-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "BERA",
    symbol: "BERA",
  },
  rpcUrls: {
    default: { http: ["https://bartio.rpc.berachain.com/"] },
    public: { http: ["https://bartio.rpc.berachain.com/"] },
  },
  blockExplorers: {
    default: { name: "BeraTrail", url: "https://bartio.beratrail.io/" },
  },
};

const config = getDefaultConfig({
  appName: "POLTech App",
  projectId: "YOUR_PROJECT_ID", // Replace with your actual project ID
  chains: [berachainTestnet],
  transports: {
    [berachainTestnet.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#7b3fe4",
            accentColorForeground: "white",
            borderRadius: "small",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Purchasing component from a similar project (POLTech)

```tsx
import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POLTECH_CONTRACT_ADDRESS } from "@/lib/constants";
import polTechABI from "@/lib/abi/POLTech.json";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ShareTradingProps = {
  initialSubject?: string;
};

export function ShareTrading({ initialSubject }: ShareTradingProps) {
  const [subjectAddress, setSubjectAddress] = useState<`0x${string}`>(
    (initialSubject as `0x${string}`) ||
      "0xf290f3d843826d00f8176182fd76550535f6dbb4"
  );
  const [amount, setAmount] = useState("");
  const { address } = useAccount();

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const { data: sharesBalance, refetch: refetchSharesBalance } =
    useReadContract({
      address: POLTECH_CONTRACT_ADDRESS,
      abi: polTechABI.abi,
      functionName: "getSharesBalance",
      args: [address ?? "0x0", subjectAddress],
    });

  const { data: buyPriceData, refetch: refetchBuyPrice } = useReadContract({
    address: POLTECH_CONTRACT_ADDRESS,
    abi: polTechABI.abi,
    functionName: "getBuyPrice",
    args: [subjectAddress, amount || "0"],
  }) as { data: [bigint, bigint] | undefined; refetch: () => void };

  const { data: sellPriceData, refetch: refetchSellPrice } = useReadContract({
    address: POLTECH_CONTRACT_ADDRESS,
    abi: polTechABI.abi,
    functionName: "getSellPrice",
    args: [subjectAddress, amount || "0"],
  }) as { data: [bigint, bigint] | undefined; refetch: () => void };

  useEffect(() => {
    if (isConfirmed) {
      refetchSharesBalance();
      refetchBuyPrice();
      refetchSellPrice();
    }
  }, [isConfirmed, refetchSharesBalance, refetchBuyPrice, refetchSellPrice]);

  const handleBuy = async () => {
    if (subjectAddress && buyPriceData) {
      const [totalPrice] = buyPriceData;
      try {
        await writeContract({
          address: POLTECH_CONTRACT_ADDRESS,
          abi: polTechABI.abi,
          functionName: "buyShares",
          args: [subjectAddress, amount],
          value: totalPrice,
        });
      } catch (error) {
        console.error("Error buying shares:", error);
      }
    }
  };

  const handleSell = async () => {
    if (subjectAddress && amount) {
      try {
        await writeContract({
          address: POLTECH_CONTRACT_ADDRESS,
          abi: polTechABI.abi,
          functionName: "sellShares",
          args: [subjectAddress, amount],
        });
      } catch (error) {
        console.error("Error selling shares:", error);
      }
    }
  };

  return (
    <div className="w-full">
      <Input
        placeholder="Subject Address"
        value={subjectAddress}
        onChange={(e) => setSubjectAddress(e.target.value as `0x${string}`)}
        className="mb-4"
      />

      <p className="mb-4 text-foreground dark:text-foreground-dark">
        Your shares balance: {sharesBalance?.toString() || "0"}
      </p>

      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="buy" className="w-1/2">
            Buy
          </TabsTrigger>
          <TabsTrigger value="sell" className="w-1/2">
            Sell
          </TabsTrigger>
        </TabsList>
        <TabsContent value="buy">
          <Input
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mb-4"
          />
          {buyPriceData && (
            <div className="mb-4 text-foreground dark:text-foreground-dark">
              <p>Total Buy Price: {formatEther(buyPriceData[0])} BERA</p>
              <p>
                {+amount ? `End` : `Current`} Share Value:{" "}
                {formatEther(buyPriceData[1])} BERA
              </p>
            </div>
          )}
          <Button
            disabled={!buyPriceData || isConfirming}
            onClick={handleBuy}
            className="w-full bg-primary hover:bg-primary-light dark:bg-primary-dark dark:hover:bg-primary text-background dark:text-background-dark"
          >
            {isConfirming ? "Confirming..." : "Buy Shares"}
          </Button>
        </TabsContent>
        <TabsContent value="sell">
          <Input
            disabled={!sharesBalance}
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mb-4"
          />
          {sellPriceData && (
            <div className="mb-4 text-foreground dark:text-foreground-dark">
              <p>Total Sell Price: {formatEther(sellPriceData[0])} BERA</p>
              <p>
                {+amount ? `End` : `Current`} Share Value:{" "}
                {formatEther(sellPriceData[1])} BERA
              </p>
            </div>
          )}
          <Button
            disabled={!sellPriceData}
            onClick={handleSell}
            className="w-full bg-primary hover:bg-primary-light dark:bg-primary-dark dark:hover:bg-primary text-background dark:text-background-dark"
          >
            Sell Shares
          </Button>
        </TabsContent>
      </Tabs>
      {hash && (
        <div className="mt-4">
          <Button
            onClick={() =>
              window.open(
                `https://bartio.beratrail.io/tx/${hash}`,
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="w-full bg-secondary hover:bg-secondary-light dark:bg-secondary-dark dark:hover:bg-secondary text-foreground dark:text-foreground-dark"
          >
            View Transaction
          </Button>
        </div>
      )}
    </div>
  );
}
```
