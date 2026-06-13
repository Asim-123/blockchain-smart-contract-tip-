export const TIP_JAR_ABI = [
  {
    type: "function",
    name: "tip",
    inputs: [{ name: "message", type: "string" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "tipWithSig",
    inputs: [
      { name: "from", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "message", type: "string" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "nonces",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "NewTip",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "message", type: "string", indexed: false },
    ],
  },
] as const;

export const EIP712_DOMAIN = {
  name: "TipJar",
  version: "1",
} as const;

export const EIP712_TIP_TYPES = {
  Tip: [
    { name: "from", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "message", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || "") as `0x${string}`;
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
