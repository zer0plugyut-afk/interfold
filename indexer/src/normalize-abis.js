import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../abis");

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  let raw = fs.readFileSync(path.join(dir, file), "utf8").replace(/^\uFEFF/, "").trim();
  let parsed = JSON.parse(raw);
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  fs.writeFileSync(path.join(dir, file), JSON.stringify(parsed));
  console.log("normalized", file, Array.isArray(parsed) ? parsed.length : typeof parsed);
}
