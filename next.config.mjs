import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  webpack(config, { dev }) {
    // Style inspector (components/dev/style-inspector.tsx) only — see devtools/dev-loc-loader.cjs
    // for why this exists instead of reading React's own debug info at runtime.
    if (dev) {
      config.module.rules.push({
        test: /\.tsx$/,
        include: [path.resolve(__dirname, "app"), path.resolve(__dirname, "components")],
        exclude: [/node_modules/, /[\\/]components[\\/]dev[\\/]/, /[\\/]components[\\/]ui[\\/]/],
        enforce: "pre",
        use: [path.resolve(__dirname, "devtools/dev-loc-loader.cjs")],
      })
    }
    return config
  },
}

export default nextConfig
