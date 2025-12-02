/**
 CLI wrapper to run ingestion locally.
 Usage:
   node --loader ts-node/esm src/cli.ts            # run ingestion
   node --loader ts-node/esm src/cli.ts --dry-run # if ingestion supports DRY_RUN
*/

import { ingestLicenses } from "./ingest.js";
import { CFG } from "./config.js";
import fs from "fs";
import path from "path";

type CLIArgs = {
  dryRun: boolean;
  from?: string;
  to?: string;
  limit?: number | undefined;
};

// very small argument parser
function parseArgs(argv: string[]): CLIArgs {
  const out: CLIArgs = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run" || a === "-d") out.dryRun = true;
    else if (a === "--from" && argv[i + 1]) {
      out.from = argv[++i];
    } else if (a === "--to" && argv[i + 1]) {
      out.to = argv[++i];
    } else if ((a === "--limit" || a === "-n") && argv[i + 1]) {
      out.limit = Number(argv[++i]);
    } else {
      console.warn("Unknown arg:", a);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  console.log("Ingest CLI starting", {
    dryRun: args.dryRun,
    from: args.from,
    to: args.to,
    limit: args.limit,
  });

  const startedAt = Date.now();

  try {
    const result = await ingestLicenses();

    const tookMs = Date.now() - startedAt;
    console.log("\n=== INGEST SUMMARY ===");
    console.log("from:", (result as any).fromDate ?? result?.fromDate ?? "n/a");
    console.log("to:  ", (result as any).toDate ?? result?.toDate ?? "n/a");
    console.log(
      "fetched:",
      (result as any).fetched ?? (result as any).fetchedRecords ?? "n/a"
    );
    console.log(
      "upserted:",
      (result as any).upserted ?? (result as any).upsertedCount ?? "n/a"
    );
    if ((result as any).distinct_hashes != null)
      console.log("distinct_hashes:", (result as any).distinct_hashes);
    console.log("duration:", `${Math.round(tookMs / 1000)}s`);
    console.log("======================\n");

    process.exit(0);
  } catch (err: any) {
    console.error("Ingest failed:", err?.message ?? err);
    // write a debug file for inspection
    try {
      const dbg = path.join(process.cwd(), `ingest-error-${Date.now()}.json`);
      fs.writeFileSync(
        dbg,
        JSON.stringify(
          { error: String(err), stack: err?.stack ?? null },
          null,
          2
        )
      );
      console.error("Wrote debug file:", dbg);
    } catch {}
    process.exit(1);
  }
}

main();
