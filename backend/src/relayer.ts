import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  type Chain,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat, sepolia } from "viem/chains";

const TIP_JAR_ABI = [
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
] as const;

export interface RelayTipRequest {
  from: `0x${string}`;
  amount: string;
  message: string;
  deadline: number;
  signature: `0x${string}`;
}

export interface RelayTipResult {
  txHash: `0x${string}`;
}

function getChain(chainId: number): Chain {
  if (chainId === sepolia.id) return sepolia;
  if (chainId === hardhat.id) return hardhat;
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  return defineChain({
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}

export async function relayTip(req: RelayTipRequest): Promise<RelayTipResult> {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const chainId = parseInt(process.env.CHAIN_ID || "31337", 10);
  const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}` | undefined;
  const relayerKey = process.env.RELAYER_PRIVATE_KEY;

  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS not configured");
  }
  if (!relayerKey) {
    throw new Error("RELAYER_PRIVATE_KEY not configured");
  }

  const chain = getChain(chainId);
  const account = privateKeyToAccount(relayerKey as `0x${string}`);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const amountWei = parseEther(req.amount);
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: TIP_JAR_ABI,
    functionName: "tipWithSig",
    args: [req.from, amountWei, req.message, BigInt(req.deadline), req.signature],
    value: amountWei,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return { txHash: hash };
}
