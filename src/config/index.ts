import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

// Load `.env` once for the whole app. Safe if the file doesn't exist.
dotenvConfig({ path: resolve(process.cwd(), ".env") });

function envString(name: string, fallback?: string): string | undefined {
    const v = process.env[name];
    const t = typeof v === "string" ? v.trim() : "";
    if (t) return t;
    return fallback;
}

function envNumber(name: string, fallback: number): number {
    const raw = envString(name);
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
    const raw = envString(name);
    if (!raw) return fallback;
    return raw.toLowerCase() === "true";
}

function envCsvLower(name: string, fallbackCsv: string): string[] {
    const raw = envString(name, fallbackCsv) ?? fallbackCsv;
    return raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}

function requireEnv(name: string): string {
    const v = envString(name);
    if (!v) throw new Error(`${name} not found`);
    return v;
}

export const config = {
    /** Enable verbose logs */
    debug: envBool("DEBUG", false),

    /** EVM chain id (Polygon mainnet = 137) */
    chainId: envNumber("CHAIN_ID", 137),

    /** Polymarket CLOB API base URL */
    clobApiUrl: envString("CLOB_API_URL", "https://clob.polymarket.com")!,

    /** Wallet private key (required for most scripts). Use config.requirePrivateKey() when needed. */
    privateKey: envString("PRIVATE_KEY"),
    requirePrivateKey: () => requireEnv("PRIVATE_KEY"),

    /** RPC configuration (used for on-chain calls like allowance/balance/redeem). */
    rpcUrl: envString("RPC_URL"),
    rpcToken: envString("RPC_TOKEN"),

    /** Global neg-risk toggle used by some on-chain allowance helpers */
    negRisk: envBool("NEG_RISK", false),

    /** Bot runner settings */
    bot: {
        minUsdcBalance: envNumber("BOT_MIN_USDC_BALANCE", 1),
        waitForNextMarketStart: envBool("TRADE_WAIT_FOR_NEXT_MARKET_START", true),
    },

    /** Console file logging */
    logging: {
        logFilePath: envString("LOG_FILE_PATH"),
        logDir: envString("LOG_DIR", "logs")!,
        logFilePrefix: envString("LOG_FILE_PREFIX", "bot")!,
    },

    /** Copytrade / Gabagool hedged bot settings */
    copytrade: {
        markets: envCsvLower("TRADE_MARKETS", envString("GABAGOOL_MARKETS", "btc")!),
        threshold: envNumber("TRADE_THRESHOLD", envNumber("GABAGOOL_THRESHOLD", 0.499)),
        reversalDelta: envNumber("REVERSAL_DELTA", 0.020),
        reversalDeltaThresholdPercent: envNumber("REVERSAL_DELTA_THRESHOLD_PERCENT", 0.5), // Percentage of reversalDelta to use in dynamic threshold (default 50%)
        maxBuysPerSide: envNumber("MAX_BUYS_PER_SIDE", 4),
        sharesPerSide: envNumber("TRADE_SHARES", envNumber("GABAGOOL_SHARES", 5)),
        tickSize: (envString("TRADE_TICK_SIZE", envString("GABAGOOL_TICK_SIZE", "0.01")!) ??
            "0.01") as "0.01" | "0.001" | "0.0001" | string,
        negRisk: envBool("TRADE_NEG_RISK", envBool("GABAGOOL_NEG_RISK", false)),
        pollMs: envNumber("TRADE_POLL_MS", envNumber("GABAGOOL_POLL_MS", 200)), // Reduced from 1000ms for speed
        maxSumAvg: envNumber("TRADE_MAX_SUM_AVG", 0.98), // Maximum sumAvg to maintain profit
        // Order matching improvements - SPEED OPTIMIZATIONS
        useFakOrders: envBool("TRADE_USE_FAK", true), // Use FAK (Fill-and-Kill) for immediate execution (default: true for speed)
        useIocOrders: envBool("TRADE_USE_IOC", false), // Use IOC (Immediate-Or-Cancel) for faster fills (deprecated, use FAK instead)
        fireAndForget: envBool("TRADE_FIRE_AND_FORGET", true), // Don't wait for order confirmation (default: true for speed)
        priceBuffer: envNumber("TRADE_PRICE_BUFFER", 0.03), // Price buffer in cents (default: 3 cents for faster fills, was 0.01)
        // Depth-based buy: Buy immediately if price drops significantly below threshold
        depthBuyDiscountPercent: envNumber("TRADE_DEPTH_BUY_DISCOUNT_PERCENT", 0.05), // Buy if price is 5% below tempPrice (0.05 = 5% discount)
        // Second side buy: Buffer for immediate buy of second side after first buy
        secondSideBuffer: envNumber("TRADE_SECOND_SIDE_BUFFER", 0.01), // Buy second side immediately when price <= (1 - firstBuyPrice) - buffer (default: 0.01 = 1 cent)
        secondSideTimeThresholdMs: envNumber("TRADE_SECOND_SIDE_TIME_THRESHOLD_MS", 200), // Buy second side after price has been below dynamic threshold for this duration (default: 500ms)
        dynamicThresholdBoost: envNumber("TRADE_DYNAMIC_THRESHOLD_BOOST", 0.04), // Add boost to dynamic threshold for more aggressive opposite side buying (default: 0.04 = 4 cents)
        maxOrderAgeMs: envNumber("TRADE_MAX_ORDER_AGE_MS", 30000), // Cancel orders older than this (30s default)
        dynamicPriceBuffer: envBool("TRADE_DYNAMIC_PRICE_BUFFER", true), // Adjust price buffer based on volatility
        // Risk management
        maxDrawdownPercent: envNumber("TRADE_MAX_DRAWDOWN_PERCENT", 0), // Stop if losses exceed this % (0 = disabled)
        minBalanceUsdc: envNumber("TRADE_MIN_BALANCE_USDC", 2), // Minimum balance before stopping (default $2)
        // Performance - SPEED OPTIMIZATIONS
        adaptivePolling: envBool("TRADE_ADAPTIVE_POLLING", true), // Adjust polling frequency based on activity
        minPollMs: envNumber("TRADE_MIN_POLL_MS", 100), // Minimum polling interval (reduced from 500ms for speed)
        maxPollMs: envNumber("TRADE_MAX_POLL_MS", 2000), // Maximum polling interval (reduced from 5000ms)
        // Order confirmation delays (reduced for speed)
        orderCheckInitialDelayMs: envNumber("TRADE_ORDER_CHECK_DELAY_MS", 100), // Initial delay before checking order (reduced from 500ms)
        orderCheckRetryDelayMs: envNumber("TRADE_ORDER_RETRY_DELAY_MS", 300), // Delay between retries (reduced from 1000ms)
        orderCheckMaxAttempts: envNumber("TRADE_ORDER_MAX_ATTEMPTS", 2), // Max order check attempts (reduced from 3)
        // State management
        cleanupOldStateDays: envNumber("TRADE_CLEANUP_STATE_DAYS", 1), // Clean up state older than N days
    },

    /** Redeem script args via env */
    redeem: {
        conditionId: envString("CONDITION_ID"),
        indexSets: envString("INDEX_SETS"),
    },
};


