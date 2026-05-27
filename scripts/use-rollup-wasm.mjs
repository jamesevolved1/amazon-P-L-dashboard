import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const nativePath = join(process.cwd(), "node_modules", "rollup", "dist", "native.js");
const wasmPath = join(process.cwd(), "node_modules", "@rollup", "wasm-node", "dist", "native.js");

if (existsSync(nativePath) && existsSync(wasmPath)) {
  writeFileSync(nativePath, "module.exports = require('../../@rollup/wasm-node/dist/native.js');\n");
}
