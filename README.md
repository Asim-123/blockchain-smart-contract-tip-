# Tip Jar dApp

Send ETH tips with a message. Everything is stored on-chain and shown in a live feed.

**What’s in this repo**

| Part | What it does |
|------|----------------|
| `contracts/` | Smart contract — receive tips, optional gasless signing |
| `backend/` | Reads tips from the chain and serves them to the UI |
| `frontend/` | Web app — connect wallet, send tips, see recent tips |

---

## Run it locally (5 steps)

You need **Node.js 18+** and **3 terminal windows**.

### Step 1 — Install everything

From the project root:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### Step 2 — Start a local blockchain

**Terminal 1** (leave this running):

```bash
npm run node
```

### Step 3 — Deploy the contract

**Terminal 2**:

```bash
npm run deploy:local
```

Copy the **contract address** from the output.

### Step 4 — Start the backend

**Terminal 2** (or a new terminal):

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set:

```
CONTRACT_ADDRESS=<paste address from step 3>
DEPLOYMENT_BLOCK=1
```

Then:

```bash
npm run dev
```

Backend URL: `http://localhost:3001`

### Step 5 — Start the frontend

**Terminal 3**:

```bash
cd frontend
cp .env.example .env
```

Open `frontend/.env` and set:

```
VITE_CONTRACT_ADDRESS=<same address as backend>
```

Then:

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Connect your wallet

Add a custom network in MetaMask (or your wallet):

| Setting | Value |
|---------|--------|
| Network name | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency | ETH |

**Test account** (Hardhat gives you free ETH):

- Private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7fe6d4776`
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

Import this key in MetaMask to send test tips.

> **Tip not showing in the feed?** Send a second tip or any transaction — the local chain needs an extra block before tips appear.

---

## How to use the app

1. Click **Connect Wallet**
2. Enter an amount and message
3. Click **Send Tip** and confirm in your wallet
4. Your tip shows up in **Recent Tips**

**Gasless mode (optional):** Turn on **Gasless tip** in the form. You only sign a message — the backend relayer pays gas. Works out of the box locally (relayer key is in `backend/.env.example`).

---

## Useful commands

```bash
# Compile & test the contract
npm run compile
npm test

# Deploy to Sepolia testnet (needs root .env — see DEPLOYMENT.md)
npm run deploy:sepolia
```

---

## API (backend)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | `{ "status": "ok" }` |
| `GET /tips` | List of confirmed tips |
| `POST /relay-tip` | Submit a gasless signed tip |

Example tip from `GET /tips`:

```json
{
  "from": "0xf39F…2266",
  "amount": "10000000000000000",
  "message": "Great work!",
  "txHash": "0x…",
  "block": 3
}
```

---

## Smart contract (short)

| Function | Who | What |
|----------|-----|------|
| `tip(message)` | Anyone | Send ETH + message |
| `tipWithSig(...)` | Relayer | Gasless tip (EIP-712 signature) |
| `withdraw()` | Owner only | Withdraw contract balance |

---

## Deploy online

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for free hosting on Sepolia + Vercel + Render.

---

## Project structure

```
├── contracts/TipJar.sol   # Smart contract
├── scripts/deploy.ts      # Deploy script
├── test/                  # Contract tests
├── backend/               # Express API + indexer
└── frontend/              # React app
```
