export const ONLYPAWS_CONTRACT_ADDRESS = "0x..."; // Replace with the actual deployed contract address
export const ONLYPAWS_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "pawId", type: "uint256" },
      { internalType: "uint256", name: "price", type: "uint256" },
    ],
    name: "addPawImage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Add other relevant ABI entries from the OnlyPaws contract
];
