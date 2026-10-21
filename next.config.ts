import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  poweredByHeader: false,
  experimental: {
    proxyClientMaxBodySize: "12mb",
    useTypeScriptCli: false,
    workerThreads: true,
    webpackBuildWorker: false,
    cpus: 2,
  },
};
export default config;
