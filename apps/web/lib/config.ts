// Which network a build talks to is fixed at build time (NEXT_PUBLIC_CLUSTER), so a devnet bundle and a
// mainnet bundle are never the same file.
export type Cluster = "localnet" | "devnet" | "mainnet";

const clusterEnv = process.env.NEXT_PUBLIC_CLUSTER;
export const CLUSTER: Cluster = clusterEnv === "localnet" || clusterEnv === "mainnet" || clusterEnv === "devnet" ? clusterEnv : "devnet";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  (CLUSTER === "localnet" ? "http://127.0.0.1:8899" : CLUSTER === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");

export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || "GDXeN1j6JkU6brXhvT7BvDrJV2TLnMC3XWotCoAPnLzH";
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
export const IS_TEST = CLUSTER !== "mainnet";

/** Short: the badge only says which network of the chain. */
export const NETWORK_NAME = CLUSTER === "devnet" ? "Devnet" : CLUSTER;
/** The gas token: what the wallet button shows next to the address and what a low balance warns about. */
export const NATIVE = "SOL";
export const NATIVE_LOW = 0.002;

const b58 = (value: unknown) => (typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,90}$/.test(value) ? value : null);
export const isTxId = (value: unknown) => !!b58(value);
export const isAddress = (value: unknown) => !!b58(value);
const solanaSuffix = CLUSTER === "mainnet" ? "" : "?cluster=" + (CLUSTER === "devnet" ? "devnet" : "custom");
export const explorerAddress = (addr: string) => (b58(addr) ? `https://explorer.solana.com/address/${addr}${solanaSuffix}` : "#");
export const explorerTx = (id: string) => (b58(id) ? `https://explorer.solana.com/tx/${id}${solanaSuffix}` : "#");
