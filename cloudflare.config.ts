import { defineSettings, defineWorker } from "wrangler/experimental-config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export const settings = defineSettings({});

export default defineWorker({
  name: "default",
  entrypoint,
  compatibilityDate: "2026-08-05",
  routes: [
    {
      pattern: "wcbn.stream",
      custom_domain: true,
    },
    {
      pattern: "www.wcbn.stream",
      custom_domain: true,
    }
  ],
});