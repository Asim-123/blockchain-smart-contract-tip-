# Free deployment — Sepolia + Vercel + Render

Deploy the full Tip Jar stack for **$0** using free tiers.

| Layer | Free service | Cost |
|-------|-------------|------|
| Smart contract | Sepolia testnet | Free |
| RPC | Alchemy or Infura | Free tier |
| Frontend | Vercel | Free |
| Backend | Render | Free (750 hrs/mo) |
| Wallet connect | WalletConnect Cloud | Free |
| Code hosting | GitHub | Free |

---

## Overview (30–45 min)

```
1. Get free accounts & API keys
2. Deploy contract → Sepolia
3. Deploy backend → Render
4. Deploy frontend → Vercel
5. Test live app
```

---

## Step 1 — Free accounts & keys

Create these (all free):

### 1a. Alchemy (RPC for Sepolia)
1. Go to [alchemy.com](https://www.alchemy.com/) → Sign up
2. Create app → Network: **Sepolia**
3. Copy **HTTPS URL** → this is your `SEPOLIA_RPC_URL`

### 1b. WalletConnect (wallet button)
1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com/)
2. Create project → copy **Project ID**

### 1c. Etherscan (optional — verify contract)
1. Go to [etherscan.io/myapikey](https://etherscan.io/myapikey)
2. Create API key

### 1d. Sepolia test ETH (gas for deploy)
Get free Sepolia ETH from any faucet:
- [Alchemy Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia)
- [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- [Sepolia Faucet](https://sepoliafaucet.com/)

You need ~0.01 ETH to deploy.

### 1e. MetaMask wallet
Export your deployer private key (account with Sepolia ETH):
MetaMask → Account → ⋮ → Account details → Show private key

> **Never commit private keys.** Use `.env` locally only; use hosting dashboards for production secrets.

---

## Step 2 — Deploy contract to Sepolia

In `tip-jar/`, create `.env`:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
```

Install dotenv (if not already):

```powershell
cd tip-jar
npm install dotenv
```

Compile and deploy:

```powershell
npm run compile
npm run deploy:sepolia
```

You'll see output like:

```
TipJar deployed to: 0xABC...
Deployment block: 5234567
Saved to deployments/TipJar.sepolia.json
```

**Save these values:**
- `CONTRACT_ADDRESS` = deployed address
- `DEPLOYMENT_BLOCK` = block number from output

### Verify on Etherscan (optional)

```powershell
npx hardhat verify --network sepolia DEPLOYED_ADDRESS
```

---

## Step 3 — Push code to GitHub

```powershell
cd c:\Users\Lenovo\Documents\taks
git init
git add .
git commit -m "Tip Jar dApp — assessment submission"
```

Create a repo on [github.com/new](https://github.com/new), then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/tip-jar.git
git branch -M main
git push -u origin main
```

---

## Step 4 — Deploy backend (Render — free)

1. Go to [render.com](https://render.com/) → Sign up (GitHub login works)
2. **New → Blueprint** (or New → Web Service)
3. Connect your GitHub repo
4. Render reads `render.yaml` automatically, OR create manually:

| Setting | Value |
|---------|-------|
| Root directory | `tip-jar/backend` |
| Build command | `npm install` |
| Start command | `npm start` |
| Instance type | **Free** |

5. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `RPC_URL` | Your Alchemy Sepolia HTTPS URL |
| `CHAIN_ID` | `11155111` |
| `CONTRACT_ADDRESS` | Your deployed address |
| `DEPLOYMENT_BLOCK` | Block from deploy output |
| `CONFIRMATIONS` | `3` (safer for testnet) |
| `PORT` | `3001` |
| `POLL_INTERVAL_MS` | `15000` |
| `RELAYER_PRIVATE_KEY` | Wallet with Sepolia ETH (pays gas for gasless tips) |

6. Deploy → copy your URL, e.g. `https://tip-jar-api.onrender.com`

> **Free tier note:** Render sleeps after 15 min idle. First request may take ~30s to wake up. Indexer re-scans from `DEPLOYMENT_BLOCK` on restart — safe, no duplicates.

Test: open `https://YOUR-API.onrender.com/health` → `{"status":"ok"}`

---

## Step 5 — Deploy frontend (Vercel — free)

1. Go to [vercel.com](https://vercel.com/) → Sign up with GitHub
2. **Add New Project** → import your repo
3. Settings:

| Setting | Value |
|---------|-------|
| Root directory | `tip-jar/frontend` |
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

4. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_CONTRACT_ADDRESS` | Your deployed Sepolia address |
| `VITE_BACKEND_URL` | `https://YOUR-API.onrender.com` |
| `VITE_WALLETCONNECT_PROJECT_ID` | Your WalletConnect project ID |
| `VITE_CHAIN` | `sepolia` |

5. Deploy → you get a URL like `https://tip-jar.vercel.app`

---

## Step 6 — Use the live app

1. Open your Vercel URL
2. Connect MetaMask
3. Switch to **Sepolia** network (add if needed — chainId `11155111`)
4. Send a tip with a message
5. Wait ~30s (confirmations + indexer poll) → tip appears in feed

---

## Quick reference — all env vars

### Contract (`tip-jar/.env`) — local deploy only
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/KEY
DEPLOYER_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
```

### Backend (Render dashboard)
```env
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/KEY
CHAIN_ID=11155111
CONTRACT_ADDRESS=0x...
DEPLOYMENT_BLOCK=5234567
CONFIRMATIONS=3
PORT=3001
```

### Frontend (Vercel dashboard)
```env
VITE_CONTRACT_ADDRESS=0x...
VITE_BACKEND_URL=https://tip-jar-api.onrender.com
VITE_WALLETCONNECT_PROJECT_ID=abc123...
VITE_CHAIN=sepolia
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Wallet won't connect | Set `VITE_WALLETCONNECT_PROJECT_ID`; use Sepolia in MetaMask |
| "Contract not configured" | Set `VITE_CONTRACT_ADDRESS` in Vercel, redeploy |
| Tips not showing | Check Render logs; confirm `DEPLOYMENT_BLOCK` is correct |
| Backend slow first load | Render free tier cold start — wait 30s, refresh |
| Deploy fails (no gas) | Get more Sepolia ETH from faucet |
| Transaction reverts | Ensure wallet is on Sepolia and has test ETH |

---

## Alternative free hosts

| Service | Use for | Notes |
|---------|---------|-------|
| **Netlify** | Frontend | Same as Vercel, set root to `tip-jar/frontend` |
| **Fly.io** | Backend | Free allowance, needs Dockerfile |
| **Infura** | RPC | Alternative to Alchemy |
| **Holesky** | Testnet | Alternative testnet to Sepolia |

---

## Production (not free)

For real mainnet: use a multisig owner, Postgres instead of JSON storage, dedicated RPC, and paid hosting with no cold starts.
