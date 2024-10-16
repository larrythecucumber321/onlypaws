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
  appName: "OnlyPaws",
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
            accentColor: "#00aff0",
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
