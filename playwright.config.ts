import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  // Not the machine's full core budget: the suite renders WebGL scenes on a
  // software rasterizer (SwiftShader), and at default parallelism the peak
  // CPU contention dips the fps-floor regression guard below its 20 fps
  // floor (observed once the visual-regression spec added more WebGL pages —
  // ticket #13). Six workers keep the run fast while leaving that test real
  // headroom.
  workers: 6,
  use: {
    baseURL: "http://localhost:5173"
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
