import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { execSync } from "child_process";

let commitHash = "unknown";
try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  console.warn("Could not get git commit hash:", e);
}

const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, "0");
const dd = String(now.getDate()).padStart(2, "0");
const hh = String(now.getHours()).padStart(2, "0");
const min = String(now.getMinutes()).padStart(2, "0");
const buildTimestamp = `${yyyy}${mm}${dd}T${hh}:${min}`;

const version = `v1.1.${commitHash}.${buildTimestamp}`;

export default defineConfig({
  plugins: [cloudflare()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  define: {
    __VERSION__: JSON.stringify(version),
  },
});