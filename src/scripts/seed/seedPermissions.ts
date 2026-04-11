import { PERMISSIONS } from "../../config/permissions";
import { PermissionModel } from "../../models/permissions.model";

export const seedPermissions = async () => {
  try {
    for (const key of PERMISSIONS) {
      await PermissionModel.updateOne(
        { key },
        {
          $setOnInsert: {
            key,
            module: key.split(".")[0],
            action: key.split(".")[1],
          },
        },
        { upsert: true }, // 🔥 prevents duplicates
      );
    }

    console.log("✅ Permissions seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding permissions:", error);
  }
};
