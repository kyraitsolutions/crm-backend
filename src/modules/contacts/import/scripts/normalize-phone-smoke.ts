import { normalizePhone } from "../pipeline/normalize.js";

const result = normalizePhone("9876543210", "IN");
if (result !== "+919876543210") {
  console.error(`normalizePhone smoke failed: got ${String(result)}`);
  process.exit(1);
}
console.log(`normalizePhone smoke ok ${result}`);
