/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // better-sqlite3 is a native module; keep it out of the webpack bundle so it
  // is required at runtime from node_modules.
  serverExternalPackages: ["better-sqlite3"],
};
export default nextConfig;
