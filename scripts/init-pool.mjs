import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = path.resolve(__dirname, "../front-end/.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join("=").trim();
      }
    }
  }
}

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_AMM_PROGRAM_ID ||
    "2TSDcRHMgevLUHFAsjxfHHrPwY29skEYPCRoVhYmowrq"
);
const TOKEN_A_MINT = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_A_MINT);
const TOKEN_B_MINT = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_B_MINT);
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

const keypairPath = path.resolve(
  process.env.HOME || "",
  ".config/solana/id.json"
);
if (!fs.existsSync(keypairPath)) {
  console.error("Solana CLI keypair not found at ~/.config/solana/id.json");
  process.exit(1);
}

const secretKey = Uint8Array.from(
  JSON.parse(fs.readFileSync(keypairPath, "utf8"))
);
const keypair = Keypair.fromSecretKey(secretKey);

console.log("Using payer wallet:", keypair.publicKey.toBase58());
console.log("Using AMM program:", PROGRAM_ID.toBase58());
console.log("Token A Mint:", TOKEN_A_MINT.toBase58());
console.log("Token B Mint:", TOKEN_B_MINT.toBase58());

const idlPath = path.resolve(__dirname, "../front-end/idl/amm.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

const connection = new Connection(RPC_URL, "confirmed");
const wallet = new Wallet(keypair);
const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
const program = new Program(idl, provider);

const [pool] = PublicKey.findProgramAddressSync(
  [Buffer.from("pool"), TOKEN_A_MINT.toBuffer(), TOKEN_B_MINT.toBuffer()],
  PROGRAM_ID
);
const [vaultA] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault_a"), TOKEN_A_MINT.toBuffer(), TOKEN_B_MINT.toBuffer()],
  PROGRAM_ID
);
const [vaultB] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault_b"), TOKEN_A_MINT.toBuffer(), TOKEN_B_MINT.toBuffer()],
  PROGRAM_ID
);
const [lpMint] = PublicKey.findProgramAddressSync(
  [Buffer.from("lp_mint"), TOKEN_A_MINT.toBuffer(), TOKEN_B_MINT.toBuffer()],
  PROGRAM_ID
);

console.log("\nDerived PDAs:");
console.log("  Pool PDA:   ", pool.toBase58());
console.log("  Vault A PDA:", vaultA.toBase58());
console.log("  Vault B PDA:", vaultB.toBase58());
console.log("  LP Mint PDA:", lpMint.toBase58());

async function main() {
  console.log("\nChecking if pool already exists...");
  const existing = await connection.getAccountInfo(pool);
  if (existing) {
    console.log("Pool is already initialized!");
    return;
  }

  console.log("Sending initialize transaction...");
  const tx = await program.methods
    .initialize()
    .accounts({
      payer: keypair.publicKey,
      pool,
      vaultA,
      vaultB,
      lpMint,
      tokenAMint: TOKEN_A_MINT,
      tokenBMint: TOKEN_B_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Pool initialized successfully!");
  console.log("Transaction signature:", tx);
}

main().catch((err) => {
  console.error("Failed to initialize pool:", err.message || err);
  process.exit(1);
});
