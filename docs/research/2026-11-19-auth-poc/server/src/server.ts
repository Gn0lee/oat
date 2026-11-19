import { serve } from "@hono/node-server";
import { getMigrations } from "better-auth/db/migration";
import { app } from "./app.js";
import { auth } from "./auth.js";

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();
serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) }, (i) => console.log(`listening ${i.port}`));
