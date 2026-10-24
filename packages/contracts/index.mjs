// The program's interface in one place: the built IDL, its generated TypeScript types, and the deployed address.
// `pnpm sync:idl` copies both files out of contracts/solana/target/idl after `anchor build`.
import idl from "./solana/idl.json" with { type: "json" };

export const PROGRAM_ID = idl.address;
export { idl };
export const idlPath = new URL("./solana/idl.json", import.meta.url).pathname;
