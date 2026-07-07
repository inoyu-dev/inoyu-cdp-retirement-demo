import path from "path";

/** Serverless hosts (Vercel) have no durable writable disk — use in-memory mock stores. */
export function isMemoryStore(): boolean {
  return Boolean(process.env.VERCEL);
}

/** Local dev only — `.data/` under the project root. */
export function getDataDir(): string {
  return path.join(process.cwd(), ".data");
}
