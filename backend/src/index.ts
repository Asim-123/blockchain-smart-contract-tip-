import "dotenv/config";
import express from "express";
import cors from "cors";
import { getConfirmedTips } from "./db";
import { startIndexer } from "./indexer";
import { relayTip, type RelayTipRequest } from "./relayer";

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/tips", (_req, res) => {
  const tips = getConfirmedTips().map((t) => ({
    from: t.from_address,
    amount: t.amount,
    message: t.message,
    txHash: t.tx_hash,
    block: t.block_number,
  }));
  res.json(tips);
});

app.post("/relay-tip", async (req, res) => {
  const body = req.body as Partial<RelayTipRequest>;
  const { from, amount, message, deadline, signature } = body;

  if (!from || !amount || message === undefined || !deadline || !signature) {
    res.status(400).json({ error: "Missing required fields: from, amount, message, deadline, signature" });
    return;
  }

  try {
    const result = await relayTip({ from, amount, message, deadline, signature });
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Relay failed";
    console.error("Relay error:", err);
    res.status(500).json({ error: msg });
  }
});

app.listen(PORT, async () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  await startIndexer();
});
