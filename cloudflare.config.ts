import { defineSettings, defineWorker } from "wrangler/experimental-config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export const settings = defineSettings({});

export default defineWorker({
  name: "wcbn-player",
  entrypoint,
  compatibilityDate: "2026-08-05",
});