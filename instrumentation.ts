import { sessionSecret } from "@/lib/session-secret";

// Runs once when the server starts: without its key the server stops here, with the reason in
// the log, instead of staying up and answering every request with an error
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    sessionSecret();
  } catch (error) {
    console.error(`[start] ${(error as Error).message}`);
    process.exit(1);
  }
}
