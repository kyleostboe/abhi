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
        // `components/dev` is the inspector itself and must not annotate its own chrome.
        // `components/ui` used to be excluded too, which made every one of shadcn's primitives
        // unselectable: a click on a Button or an Avatar found no anchor on the element or on
        // anything between it and the nearest app component, so the selection jumped to a distant
        // ancestor instead of the thing under the cursor.
        exclude: [/node_modules/, /[\\/]components[\\/]dev[\\/]/],
        enforce: "pre",
        use: [path.resolve(__dirname, "devtools/dev-loc-loader.cjs")],
      })
    }
    return config
  },
}

export default nextConfig
