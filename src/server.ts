import { env } from "./config/env";
import { createApp } from "./infrastructure/http/app";

const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://127.0.0.1:${env.PORT} (${env.NODE_ENV})`);
});