# Polymarket Hedged Arbitrage Bot - Complete Feature Summary

## 🎯 Overview

This is a sophisticated **hedged arbitrage trading bot** for Polymarket's 15-minute binary markets (e.g., "BTC Up/Down 15m"). The bot implements a hedging strategy that buys both sides (YES/NO) of binary markets at favorable prices to capture arbitrage opportunities while maintaining risk-neutral positions.

**Note**: The README mentions "copy trading" but the actual implementation is a hedged arbitrage strategy (formerly called "Gabagool").

---

## 🏗️ Core Architecture

### Technology Stack
- **Runtime**: TypeScript/Node.js (via ts-node)
- **Blockchain**: Polygon (chain ID 137)
- **APIs**:
  - Polymarket CLOB Client (`@polymarket/clob-client`) - Order execution
  - Polymarket Gamma API - Market data and token IDs
- **Web3**: Ethers.js v6 for blockchain interactions
- **State Management**: JSON file-based persistence
- **Logging**: Custom logger with file output (logs/bot-{date}.log)

### Project Structure
```
src/
├── index.ts              # Main entry point (starts bot)
├── auto-redeem.ts        # Automated redemption script
├── redeem.ts             # Manual redemption script
├── redeem-holdings.ts    # Redemption worker (records PnL)
├── balance-logger.ts     # Periodic balance logging
├── config/               # Configuration management
├── order-builder/        # Trading strategy implementation
│   ├── copytrade.ts     # Main bot logic (CopytradeArbBot class)
│   ├── helpers.ts       # Order conversion utilities
│   └── types.ts         # Type definitions
├── providers/            # API clients
│   ├── clobclient.ts    # CLOB API client
│   └── rpcProvider.ts   # RPC provider
├── security/             # Security utilities
│   ├── allowance.ts     # Token approval management
│   └── createCredential.ts # API credential generation
└── utils/                # Utility functions
    ├── balance.ts       # Balance checking
    ├── holdings.ts      # Holdings management
    ├── redeem.ts        # Redemption logic
    ├── logger.ts        # Logging utility
    └── console-file.ts  # File logging setup
```

---

## 📊 Trading Strategy: Hedged Arbitrage

### Core Concept

The bot trades **15-minute binary markets** (e.g., "btc-updown-15m-{timestamp}") by:
1. **Buying YES tokens** when price drops below threshold
2. **Buying NO tokens** to hedge the position
3. Maintaining balanced positions (equal exposure on both sides)
4. Profiting from price inefficiencies while minimizing directional risk

### Market Cycle

- Markets reset every **15 minutes** at boundaries (00:00, 00:15, 00:30, 00:45, etc.)
- Each cycle creates a new market slug: `{market}-updown-15m-{timestamp}`
- Bot automatically detects new market cycles and resets tracking state

### Trading Algorithm

#### 1. **Entry Strategy (Flexible Entry)**
- After hedge completion, bot resets and waits for new entry
- **First buy**: Selects whichever token (YES/NO) drops below `TRADE_THRESHOLD` (default: 0.499)
- Flexible entry allows better timing by choosing the better entry point

#### 2. **Hedging Strategy (Strict Alternation)**
- After first buy, bot **always alternates** to the opposite side
- Maintains hedge balance by buying both sides
- Tracks lowest price seen (`tempPrice`) for each token

#### 3. **Buy Triggers**

**a) Depth-Based Buy (Immediate)**
- Triggers when price drops `TRADE_DEPTH_BUY_DISCOUNT_PERCENT` (default: 5%) below `tempPrice`
- Catches deep discounts immediately without waiting for reversal

**b) Second Side Buy (Immediate)**
- After first buy, calculates dynamic threshold: `1 - firstBuyPrice + boost`
- Buys second side immediately when price ≤ `(dynamicThreshold - buffer)`
- No reversal wait - immediate execution for speed

**c) Reversal-Based Buy (Traditional)**
- Triggers when price reverses: `price > (tempPrice + REVERSAL_DELTA)`
- Only used if immediate buys didn't trigger

#### 4. **Profitability Guard (sumAvg)**
- Calculates weighted average cost: `avgYES + avgNO = sumAvg`
- Only allows buys if `sumAvg <= TRADE_MAX_SUM_AVG` (default: 0.98)
- Ensures positions remain profitable (sumAvg < 1.0 means net profit)

#### 5. **Position Limits**
- Maximum buys per side: `MAX_BUYS_PER_SIDE` (default: 4)
- Shares per buy: `TRADE_SHARES` (default: 5)
- Total max positions: `4 YES buys × 5 shares + 4 NO buys × 5 shares = 40 shares total`

#### 6. **Hedge Completion**
- Hedge completes when **both sides** reach `MAX_BUYS_PER_SIDE`
- Bot resets tracking state and waits for next entry opportunity
- Logs completion with final averages and sumAvg

---

## ⚙️ Configuration (Environment Variables)

### Market Selection
- `TRADE_MARKETS`: Comma-separated markets (e.g., "btc,eth,sol") - Default: "btc"

### Entry Parameters
- `TRADE_THRESHOLD`: Initial entry threshold (default: 0.499)
- `REVERSAL_DELTA`: Price reversal delta for buy triggers (default: 0.020)
- `REVERSAL_DELTA_THRESHOLD_PERCENT`: Percentage of reversalDelta for dynamic threshold (default: 0.5)

### Position Sizing
- `MAX_BUYS_PER_SIDE`: Maximum buys per side (default: 4)
- `TRADE_SHARES`: Shares per buy (default: 5)
- `TRADE_MAX_SUM_AVG`: Maximum sumAvg to maintain profit (default: 0.98)

### Order Execution
- `TRADE_TICK_SIZE`: Price precision (default: "0.01")
- `TRADE_USE_FAK`: Use FAK orders (default: true)
- `TRADE_FIRE_AND_FORGET`: Don't wait for order confirmation (default: true)
- `TRADE_PRICE_BUFFER`: Price buffer in cents (default: 0.03 = 3 cents)
- `TRADE_DYNAMIC_PRICE_BUFFER`: Adjust buffer based on volatility (default: true)

### Advanced Trading
- `TRADE_DEPTH_BUY_DISCOUNT_PERCENT`: Depth buy discount % (default: 0.05 = 5%)
- `TRADE_SECOND_SIDE_BUFFER`: Second side buy buffer (default: 0.01)
- `TRADE_DYNAMIC_THRESHOLD_BOOST`: Dynamic threshold boost (default: 0.04)
- `TRADE_MAX_ORDER_AGE_MS`: Cancel orders older than this (default: 30000 = 30s)

### Performance
- `TRADE_POLL_MS`: Base polling interval (default: 200ms)
- `TRADE_ADAPTIVE_POLLING`: Enable adaptive polling (default: true)
- `TRADE_MIN_POLL_MS`: Minimum poll interval (default: 100ms)
- `TRADE_MAX_POLL_MS`: Maximum poll interval (default: 2000ms)

### Risk Management
- `TRADE_MAX_DRAWDOWN_PERCENT`: Stop if losses exceed % (default: 0 = disabled)
- `TRADE_MIN_BALANCE_USDC`: Minimum balance before stopping (default: 2)
- `TRADE_NEG_RISK`: Enable negative risk (default: false)

### Bot Control
- `BOT_MIN_USDC_BALANCE`: Minimum USDC balance to start (default: 1)
- `TRADE_WAIT_FOR_NEXT_MARKET_START`: Wait for 15m boundary (default: true)
- `TRADE_CLEANUP_STATE_DAYS`: Clean up old state (default: 1)

### Wallet & API
- `PRIVATE_KEY`: Wallet private key (required)
- `CHAIN_ID`: Blockchain chain ID (default: 137 = Polygon)
- `CLOB_API_URL`: CLOB API endpoint (default: https://clob.polymarket.com)
- `RPC_URL`: RPC provider URL (optional)
- `RPC_TOKEN`: RPC provider token (optional)

### Logging
- `LOG_FILE_PATH`: Log file path (supports {date} placeholder)
- `LOG_DIR`: Log directory (default: "logs")
- `LOG_FILE_PREFIX`: Log file prefix (default: "bot")
- `DEBUG`: Enable debug logs (default: false)

---

## 🔄 Main Features

### 1. **Automated Trading Bot** (`src/index.ts`)

**Startup Sequence:**
1. Creates API credentials if missing (`src/data/credential.json`)
2. Approves USDC allowances to Polymarket contracts
3. Syncs allowances with CLOB API
4. Waits for minimum USDC balance (`BOT_MIN_USDC_BALANCE`)
5. Optionally waits for next 15-minute market boundary
6. Starts `CopytradeArbBot` trading loop

**Trading Loop:**
- Polls market prices at configurable intervals (default: 200ms)
- Adaptive polling: speeds up when opportunities detected, slows down when idle
- Tracks multiple markets concurrently (supports comma-separated markets)
- Detects new 15-minute market cycles automatically
- Manages state persistence (saves to `src/data/copytrade-state.json`)

**State Management:**
- **Persistent State**: Saved to `src/data/copytrade-state.json`
  - Tracks positions per market slug
  - Records quantities, costs, buy counts, averages
  - Includes metadata (conditionId, slug, market, upIdx, downIdx)
- **In-Memory Tracking**: Dynamic tracking state (resets on restart)
  - Tracks current token being monitored
  - Tracks lowest price seen (`tempPrice`)
  - Tracks hedge status and buy attempts

**Performance Optimizations:**
- Debounced state saving (50ms) to batch rapid updates
- Fire-and-forget order execution (don't wait for confirmation)
- Adaptive polling based on market activity
- Stale order cancellation (cancels orders older than 30s)
- Price buffer optimization (dynamic buffer based on sumAvg)

**Safety Features:**
- Balance checks before orders
- SumAvg profitability guard
- Maximum position limits per side
- Drawdown protection (optional)
- Minimum balance protection
- Order age limits (cancels stale orders)

### 2. **Automated Redemption** (`src/redeem-holdings.ts`)

**Purpose**: Worker script that runs separately to redeem resolved markets and record PnL

**Features:**
- Runs in loop mode (default) or once (--once flag)
- Checks all markets in holdings for resolution status
- Automatically redeems winning positions
- Records realized PnL to `logs/pnl.log`
- Clears holdings after successful redemption
- Prunes old state entries to keep state file small

**Usage:**
```bash
# Run once
npm run redeem:holdings

# Run in loop (default)
ts-node src/redeem-holdings.ts

# Dry run
ts-node src/redeem-holdings.ts --dry-run

# Custom interval
ts-node src/redeem-holdings.ts --interval-ms 300000  # 5 minutes
```

**PnL Logging:**
- Records: timestamp, slug, market, conditionId, pnl, cost, payout, quantities, winners, balance
- Format: `{iso} slug={slug} market={market} conditionId={id} pnl={pnl} cost={cost} payout={payout} ...`
- Appends to `logs/pnl.log` (append-only log)

### 3. **Manual Redemption Scripts**

#### `src/auto-redeem.ts`
**Purpose**: Check and redeem resolved markets from holdings or API

**Features:**
- Check specific market: `--check <conditionId>`
- Dry run mode: `--dry-run`
- API method: `--api` (fetches all markets from Polymarket API)
- Clear holdings: `--clear-holdings`
- Limit markets: `--max N`

**Usage:**
```bash
# Check and redeem from holdings
ts-node src/auto-redeem.ts

# Check specific market
ts-node src/auto-redeem.ts --check <conditionId>

# Redeem from API
ts-node src/auto-redeem.ts --api --max 500
```

#### `src/redeem.ts`
**Purpose**: Redeem specific market with manual control

**Usage:**
```bash
# Redeem specific market
ts-node src/redeem.ts <conditionId>

# Redeem with specific index sets
ts-node src/redeem.ts <conditionId> 1 2
```

### 4. **Balance Logger** (`src/balance-logger.ts`)

**Purpose**: Periodically logs wallet balance to `logs/balance.log`

**Features:**
- Logs balance every 15 minutes (aligned to market boundaries)
- Runs continuously or once (`--once` flag)
- Format: `{iso} {marketSlug} balance={balance}`

**Usage:**
```bash
npm run balance:log

# Run once
ts-node src/balance-logger.ts --once
```

---

## 📁 Data Files

### State Files

1. **`src/data/copytrade-state.json`**
   - **Purpose**: Persistent trading state
   - **Structure**: `{ "copytrade:{slug}": { qtyYES, qtyNO, costYES, costNO, ... } }`
   - **Updated**: After each buy (debounced 50ms)
   - **Cleaned**: Old entries pruned by `redeem-holdings.ts`

2. **`src/data/token-holding.json`**
   - **Purpose**: Token holdings database (for redemption)
   - **Structure**: `{ "{conditionId}": { "{tokenId}": amount } }`
   - **Updated**: After successful buy orders
   - **Cleared**: After successful redemption

3. **`src/data/credential.json`**
   - **Purpose**: Polymarket API credentials
   - **Structure**: `{ key, secret, passphrase }`
   - **Created**: Automatically on first run if missing

### Log Files

1. **`logs/bot-{date}.log`** (or `logs/bot.log`)
   - **Purpose**: All console output (stdout/stderr)
   - **Created**: Automatically by console-file logger
   - **Format**: Includes timestamps and log levels

2. **`logs/pnl.log`**
   - **Purpose**: Realized PnL log (append-only)
   - **Created**: By `redeem-holdings.ts`
   - **Format**: Space-separated key=value pairs

3. **`logs/balance.log`**
   - **Purpose**: Periodic balance snapshots
   - **Created**: By `balance-logger.ts`
   - **Format**: `{iso} {marketSlug} balance={balance}`

---

## 🔒 Security Features

1. **Credential Management**
   - API credentials stored in `src/data/credential.json`
   - Auto-generated on first run
   - Never hardcoded in source

2. **Private Key Security**
   - Loaded from environment variable (`PRIVATE_KEY`)
   - Never logged or exposed

3. **Allowance Management**
   - Automatic USDC approval to Polymarket contracts
   - Syncs allowances with CLOB API
   - Respects negative risk settings

4. **Balance Validation**
   - Pre-order balance checks
   - Minimum balance requirements
   - Drawdown protection

5. **Error Handling**
   - Comprehensive error handling with graceful degradation
   - Retry logic for network/RPC errors
   - Detailed error logging

---

## 📈 Trading Metrics & Monitoring

### Bot Metrics (Logged Hourly)
- Total orders placed
- Successful vs failed orders
- Total spent/received
- Average sumAvg
- Errors and API errors
- Balance tracking

### State Tracking
- Per-market position tracking
- Buy counts per side
- Cost averages (avgYES, avgNO, sumAvg)
- Last buy side and prices
- Attempt counts (successful + failed)

### Logging Levels
- **SUCCESS**: Successful operations (green)
- **INFO**: General information (cyan)
- **WARNING**: Non-critical issues (yellow)
- **ERROR**: Errors requiring attention (red)
- **DEBUG**: Detailed debug info (magenta, only if DEBUG=true)

---

## 🚀 Execution Flow

### Bot Startup (`src/index.ts`)
```
1. Load configuration from environment
2. Create API credentials (if needed)
3. Initialize CLOB client
4. Approve USDC allowances
5. Wait for minimum balance
6. Wait for 15m boundary (optional)
7. Start CopytradeArbBot
```

### Trading Loop (`CopytradeArbBot.tick()`)
```
For each market:
  1. Get current 15m market slug
  2. Detect new market cycle (reset if needed)
  3. Fetch token IDs from Gamma API
  4. Get current prices (YES/NO midpoints)
  5. Load state for current slug
  6. Check if hedge complete (both sides maxed)
  7. Initialize tracking state (if needed)
  8. Select token to track (flexible entry or alternation)
  9. Check buy triggers:
     - Depth-based buy (5% discount)
     - Second side buy (dynamic threshold)
     - Reversal buy (traditional)
  10. Validate profitability (sumAvg check)
  11. Execute buy order (if triggered)
  12. Update state and switch to opposite side
  13. Save state (debounced)
```

### Redemption Flow (`redeem-holdings.ts`)
```
1. Load all markets from token-holding.json
2. For each market:
   a. Check if resolved (Gamma API)
   b. Get winning outcomes
   c. Check user's token balances
   d. Redeem winning positions (if any)
   e. Clear holdings
   f. Record PnL to pnl.log
3. Prune old state entries
4. Wait for next interval (15m default)
```

---

## ⚠️ Risk Considerations

1. **Market Risk**: Hedging strategy reduces directional risk but doesn't eliminate it
2. **Liquidity Risk**: Orders may not fill completely, especially during volatility
3. **Slippage**: Market orders execute at current market price (may differ from expected)
4. **Gas Costs**: Each transaction incurs Polygon gas fees
5. **API Limits**: Rate limiting may affect order execution
6. **Timing Risk**: 15-minute markets have fixed resolution times
7. **sumAvg Risk**: If sumAvg exceeds 0.98, positions may be unprofitable
8. **State Persistence**: Bot state saved to disk (risk of corruption/loss)

---

## 🔧 Maintenance & Operations

### Starting the Bot
```bash
# Using npm script
npm start

# Direct execution
ts-node src/index.ts
```

### Monitoring
- Check logs: `tail -f logs/bot-$(date +%Y-%m-%d).log`
- Check balance: `cat logs/balance.log | tail -10`
- Check PnL: `cat logs/pnl.log | tail -20`
- Check state: `cat src/data/copytrade-state.json | jq`

### Stopping the Bot
- Send SIGINT/SIGTERM (Ctrl+C)
- Bot will save state before exiting

### State Management
- State file: `src/data/copytrade-state.json`
- Holdings file: `src/data/token-holding.json`
- State is automatically pruned by `redeem-holdings.ts`
- Manual cleanup: Delete old entries from state file

### Troubleshooting
- Check logs for errors
- Verify wallet balance
- Check API credentials
- Verify RPC connectivity
- Check state file integrity
- Verify market resolution status

---

## 📝 Key Differences from README

**Note**: The README describes a "copy trading" bot, but the actual implementation is a **hedged arbitrage bot**. Key differences:

1. **Strategy**: Hedged arbitrage (buying both sides) vs. copy trading (mirroring other traders)
2. **Market Type**: 15-minute binary markets (Up/Down) vs. any market type
3. **Entry Logic**: Threshold-based entry with alternation vs. trade detection
4. **Position Management**: Balanced hedging vs. directional positions
5. **State Tracking**: Market slug-based state vs. trade-based tracking

The bot was likely renamed from "Gabagool" to "Copytrade" but the core strategy remains hedged arbitrage.

---

## 🎯 Summary

This is a sophisticated, production-ready hedged arbitrage trading bot for Polymarket's 15-minute binary markets. It implements:

- ✅ Automated trading with hedging strategy
- ✅ Multi-market support (concurrent trading)
- ✅ State persistence and recovery
- ✅ Automated redemption with PnL tracking
- ✅ Risk management (sumAvg guard, position limits)
- ✅ Performance optimizations (adaptive polling, fire-and-forget)
- ✅ Comprehensive logging and monitoring
- ✅ Error handling and recovery
- ✅ Security best practices

The bot is designed to run continuously, automatically trading 15-minute markets, maintaining hedged positions, and redeeming winning positions as markets resolve.

