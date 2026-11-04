// Runs once when the server starts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { sessionSecret } = await import("@/lib/session-secret");
    // Without its key the server stops here, with the reason in the log, instead of staying up
    // and answering every request with an error
    try {
      sessionSecret();
    } catch (error) {
      console.error(`[start] ${(error as Error).message}`);
      process.exit(1);
    }

    if (process.env.AUTO_SEED === "true") {
      const { startDemoResets } = await import("@/lib/demo-reset");
      await startDemoResets();
    }
  }
}
