import axios from "axios";
import type { Wallet } from "@ethersproject/wallet";
import { logger } from "./logger";

/** Signed order (from createOrder) – shape accepted by Polymarket CLOB health/simulate API */
export type SignedOrderPayload = Record<string, unknown>;

/**
 * Simulate a transaction via Polymarket CLOB health API.
 * Accepts a Wallet instance (e.g. new Wallet(privateKey)); sends wallet.address in the body.
 * POST body: { wallet: string, tx: SignedOrder }.
 * Does not throw on non-2xx; logs and returns false so order posting can continue.
 */
export async function simulateTx(
    wallet: Wallet,
    tx: SignedOrderPayload,
    baseUrl: string
): Promise<boolean> {
    const url = baseUrl.replace(/\/$/, "");
    try {
        const res = await axios.post(
            url,
            { wallet, tx },
            {
                headers: { "Content-Type": "application/json" },
                timeout: 10_000,
                validateStatus: () => true,
            }
        );
        if (res.status >= 200 && res.status < 300) {
            logger.info(`Tx simulate OK (${res.status}) ${url}`);
            return true;
        }
        logger.warning(`Tx simulate non-OK ${url} status=${res.status} data=${JSON.stringify(res.data)}`);
        return false;
    } catch (e) {
        logger.warning(`Tx simulate failed ${url}: ${e instanceof Error ? e.message : String(e)}`);
        return false;
    }
}
