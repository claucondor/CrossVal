import { env } from "./config/env";
import { connect } from "./infrastructure/db/connection";
import { createApp } from "./infrastructure/http/app";

async function main(): Promise<void> {
  await connect();
  const app = createApp();

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("[server] fatal:", err);
  process.exit(1);
});
