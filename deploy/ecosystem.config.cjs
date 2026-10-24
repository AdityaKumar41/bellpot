// pm2 process list for the devnet deployment (runs as the `bellpot` unix user).
//   pm2 start deploy/ecosystem.config.cjs && pm2 save
// The API reads program state through the public devnet RPC (getProgramAccounts every 15 s).
// The site is the Next.js app (bellpot-web). Build it with NEXT_PUBLIC_CLUSTER=devnet before starting pm2.
const HOME = "/home/bellpot";
const fs = require("fs");
// The provider endpoint the crons use (one line in the secrets dir): the faucet sends through it, the state polling does not.
let FAUCET_RPC = ""; try { FAUCET_RPC = fs.readFileSync(`${HOME}/secrets/devnet/rpc-url`, "utf8").trim(); } catch {}
module.exports = {
  apps: [
    {
      name: "bellpot-api",
      cwd: `${HOME}/apps/bellpot`,
      script: "apps/server/src/http/server.ts",
      node_args: "--experimental-strip-types --disable-warning=ExperimentalWarning",
      env: {
        CLUSTER: "devnet",
        CLUSTER_RPC: "https://api.devnet.solana.com",
        BELLPOT_SECRETS: `${HOME}/secrets/devnet`,
        DATA_DIR: `${HOME}/data`,
        PORT: "5041",
        ...(FAUCET_RPC ? { FAUCET_RPC } : {}),
      },
      max_memory_restart: "300M",
      out_file: `${HOME}/logs/api.out.log`,
      error_file: `${HOME}/logs/api.err.log`,
    },
    {
      name: "bellpot-web",
      cwd: `${HOME}/apps/bellpot/apps/web`,
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 --port 3000",
      env: { NODE_ENV: "production", API_ORIGIN: "http://127.0.0.1:5041" },
      max_memory_restart: "400M",
      out_file: `${HOME}/logs/web.out.log`,
      error_file: `${HOME}/logs/web.err.log`,
    },
  ],
};
