import mongoose from "mongoose";
import { config } from "../../config/index.js";
import { SubscriptionService } from "../../services/subscription.service.js";

async function run() {
  await mongoose.connect(config.db.url);
  const result = await new SubscriptionService().backfillExistingOrganizations();
  console.log("Backfill complete", result);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
