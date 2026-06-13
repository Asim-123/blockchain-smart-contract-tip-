import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSignTypedData,
  useReadContract,
} from "wagmi";
import { parseEther, formatEther, type BaseError } from "viem";
import {
  TIP_JAR_ABI,
  CONTRACT_ADDRESS,
  BACKEND_URL,
  EIP712_DOMAIN,
  EIP712_TIP_TYPES,
} from "./config";
import { activeChain } from "./wagmi";

type TxStatus = "idle" | "awaiting-signature" | "pending" | "confirmed" | "error";

const PRESET_AMOUNTS = ["0.001", "0.01", "0.05", "0.1"];

export interface Tip {
  from: string;
  amount: string;
  message: string;
  txHash: string;
  block: number;
}

function addressInitials(address: string): string {
  return address.slice(2, 4).toUpperCase();
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function StatusBanner({ status, message }: { status: TxStatus; message: string }) {
  const icons: Record<string, string> = {
    "awaiting-signature": "✍️",
    pending: "⏳",
    confirmed: "✓",
    error: "✕",
  };
  const cls = status === "error" ? "error" : status === "confirmed" ? "confirmed" : "pending";
  return (
    <div className={`status ${cls}`}>
      <span className="status-icon">{icons[status] ?? "•"}</span>
      <span>{message}</span>
    </div>
  );
}

export function TipForm({ onTipConfirmed }: { onTipConfirmed: () => void }) {
  const { isConnected, address } = useAccount();
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [gasless, setGasless] = useState(false);
  const [status, setStatus] = useState<TxStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContract, data: hash, error: writeError, isPending: isSigning, reset } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();

  const { data: nonce } = useReadContract({
    address: CONTRACT_ADDRESS || undefined,
    abi: TIP_JAR_ABI,
    functionName: "nonces",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(CONTRACT_ADDRESS && address && gasless) },
  });

  const { isLoading: isConfirming, isSuccess, isError: isReceiptError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (hash) {
      setTxHash(hash);
      setStatus("pending");
      setStatusMessage(`Transaction submitted — waiting for block confirmation…`);
    }
  }, [hash]);

  useEffect(() => {
    if (isSigning) {
      setStatus("awaiting-signature");
      setStatusMessage("Confirm the transaction in your wallet to send your tip.");
    }
  }, [isSigning]);

  useEffect(() => {
    if (isConfirming && txHash) {
      setStatus("pending");
      setStatusMessage(`Mining transaction ${txHash.slice(0, 8)}…${txHash.slice(-6)}`);
    }
  }, [isConfirming, txHash]);

  useEffect(() => {
    if (isSuccess) {
      setStatus("confirmed");
      setStatusMessage("Tip confirmed on-chain! It will appear in the feed shortly.");
      onTipConfirmed();
      setMessage("");
      setTimeout(() => {
        setStatus("idle");
        setStatusMessage("");
        setTxHash(undefined);
        reset();
      }, 5000);
    }
  }, [isSuccess, onTipConfirmed, reset]);

  useEffect(() => {
    if (writeError) {
      const msg = (writeError as BaseError).shortMessage || writeError.message;
      const isRejection = msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("denied");
      setStatus("error");
      setStatusMessage(isRejection ? "Transaction cancelled — you rejected the wallet signature." : msg);
    }
  }, [writeError]);

  useEffect(() => {
    if (isReceiptError) {
      setStatus("error");
      setStatusMessage("Transaction reverted on-chain. Check your balance and try again.");
    }
  }, [isReceiptError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!CONTRACT_ADDRESS) {
      setStatus("error");
      setStatusMessage("Contract address not configured. Set VITE_CONTRACT_ADDRESS.");
      return;
    }

    if (gasless) {
      if (!address) return;
      setStatus("awaiting-signature");
      setStatusMessage("Sign the tip authorization in your wallet (no gas required).");

      try {
        const amountWei = parseEther(amount);
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const signature = await signTypedDataAsync({
          domain: {
            ...EIP712_DOMAIN,
            chainId: activeChain.id,
            verifyingContract: CONTRACT_ADDRESS,
          },
          types: EIP712_TIP_TYPES,
          primaryType: "Tip",
          message: {
            from: address,
            amount: amountWei,
            message,
            nonce: nonce ?? 0n,
            deadline: BigInt(deadline),
          },
        });

        setStatus("pending");
        setStatusMessage("Relaying your signed tip…");

        const res = await fetch(`${BACKEND_URL}/relay-tip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: address,
            amount,
            message,
            deadline,
            signature,
          }),
        });

        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error || `Relay failed (${res.status})`);
        }

        const { txHash: relayedHash } = (await res.json()) as { txHash: `0x${string}` };
        setTxHash(relayedHash);
        setStatus("confirmed");
        setStatusMessage("Gasless tip confirmed on-chain! It will appear in the feed shortly.");
        onTipConfirmed();
        setMessage("");
        setTimeout(() => {
          setStatus("idle");
          setStatusMessage("");
          setTxHash(undefined);
        }, 5000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gasless tip failed";
        const isRejection = msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("denied");
        setStatus("error");
        setStatusMessage(isRejection ? "Signature cancelled — you rejected the wallet prompt." : msg);
      }
      return;
    }

    setStatus("awaiting-signature");
    setStatusMessage("Confirm the transaction in your wallet to send your tip.");
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: TIP_JAR_ABI,
      functionName: "tip",
      args: [message],
      value: parseEther(amount),
    });
  };

  const isBusy = status === "awaiting-signature" || status === "pending";

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title-row">
            <span className="card-icon">✦</span>
            <h2 className="card-title">Send a Tip</h2>
          </div>
          <p className="card-subtitle">
            {gasless ? "Sign off-chain — relayer submits for you" : "Attach a message and send ETH on-chain"}
          </p>
        </div>
      </div>

      {!isConnected && (
        <div className="wallet-hint">
          <span className="wallet-hint-icon">🔗</span>
          Connect your wallet to start tipping
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <div className="gasless-row">
            <div className="gasless-info">
              <span className="gasless-label">Gasless tip</span>
              <span className="gasless-desc">EIP-712 signature — relayer pays gas</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={gasless}
                onChange={(e) => setGasless(e.target.checked)}
                disabled={!isConnected || isBusy}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <div className="amount-input-wrap">
            <input
              id="amount"
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!isConnected || isBusy}
              required
            />
            <span className="amount-suffix">ETH</span>
          </div>
          <div className="amount-presets">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`preset-btn${amount === preset ? " active" : ""}`}
                disabled={!isConnected || isBusy}
                onClick={() => setAmount(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="message">Your Message</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isConnected || isBusy}
            placeholder="Leave a note of appreciation…"
            maxLength={280}
            required
          />
          <div className="char-count">{message.length}/280</div>
        </div>

        <button className="btn-primary" type="submit" disabled={!isConnected || isBusy}>
          {isBusy ? (
            <>
              <span className="btn-spinner" />
              Processing…
            </>
          ) : gasless ? (
            <>✍️ Sign & Relay Tip</>
          ) : (
            <>🫙 Send Tip</>
          )}
        </button>
      </form>

      {status !== "idle" && <StatusBanner status={status} message={statusMessage} />}
    </div>
  );
}

export function TipList({ onStatsChange }: { onStatsChange?: (tips: Tip[]) => void }) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTips = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/tips`);
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      const data: Tip[] = await res.json();
      setTips(data);
      onStatsChange?.(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tips");
    } finally {
      setLoading(false);
    }
  }, [onStatsChange]);

  useEffect(() => {
    fetchTips();
    const interval = setInterval(fetchTips, 5000);
    return () => clearInterval(interval);
  }, [fetchTips]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title-row">
            <span className="card-icon feed">⚡</span>
            <h2 className="card-title">Recent Tips</h2>
          </div>
          <p className="card-subtitle">Confirmed on-chain contributions</p>
        </div>
        <span className="live-badge">
          <span className="live-dot" />
          Live
        </span>
      </div>

      {loading && (
        <div className="skeleton-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-item" />
          ))}
        </div>
      )}

      {error && <StatusBanner status="error" message={error} />}

      {!loading && !error && tips.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon-wrap">🫙</div>
          <strong>No tips yet</strong>
          <p>Be the first to show your appreciation on-chain.</p>
        </div>
      )}

      <ul className="tip-list">
        {tips.map((tip) => (
          <li key={tip.txHash} className="tip-item">
            <div className="tip-avatar">{addressInitials(tip.from)}</div>
            <div className="tip-body">
              <p className="tip-message">{tip.message}</p>
              <div className="tip-meta">
                <span className="tip-amount-badge">
                  ◆ {Number(formatEther(BigInt(tip.amount))).toFixed(4)} ETH
                </span>
                <span className="tip-address">{formatAddress(tip.from)}</span>
                <span className="tip-block">block {tip.block}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatsBar({ tips }: { tips: Tip[] }) {
  const totalEth = useMemo(
    () => tips.reduce((sum, t) => sum + Number(formatEther(BigInt(t.amount))), 0),
    [tips]
  );

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-card-inner">
          <div className="stat-icon tips">📊</div>
          <div className="stat-content">
            <div className="stat-label">Total Tips</div>
            <div className="stat-value">{tips.length}</div>
          </div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-card-inner">
          <div className="stat-icon volume">◆</div>
          <div className="stat-content">
            <div className="stat-label">Total Volume</div>
            <div className="stat-value accent">{totalEth.toFixed(4)} ETH</div>
          </div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-card-inner">
          <div className="stat-icon network">⬡</div>
          <div className="stat-content">
            <div className="stat-label">Network</div>
            <div className="stat-value network-name">{activeChain.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
