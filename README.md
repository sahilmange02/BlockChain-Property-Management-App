# Blockchain Land Registry

## Startup Instructions

Run these commands in **separate terminals** (in order):

| Terminal | Command | Purpose |
|----------|---------|---------|
| 1 | `cd contracts && npx hardhat node` | Start local blockchain |
| 2 | `npm run deploy:local` | Deploy smart contract (run once) |
| 3 | `cd backend && npm run dev` | Start backend API |
| 4 | `cd frontend && npm run dev` | Start frontend website |

### Notes
- **MongoDB:** Uses MongoDB Atlas (online) — no local setup needed
- **IPFS:** Uses Pinata (online) — no local daemon needed. Add `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` to backend `.env`
