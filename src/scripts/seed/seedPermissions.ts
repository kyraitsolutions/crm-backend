import { PERMISSIONS } from "../../config/permissions.js";
import { PermissionModel } from "../../models/permissions.model.js";

export const seedPermissions = async () => {
  try {
    for (const key of PERMISSIONS) {
      const [module, action] = key.split(".");
      await PermissionModel.updateOne( 
        { key },
        {
          $setOnInsert: {
            key,
            module,
            action,
          },
        },
        { upsert: true },
      );
      
    }

    console.log(`✅ Permissions seeded successfully (${PERMISSIONS.length} keys)`);
  } catch (error) {
    console.error("❌ Error seeding permissions:", error);
    throw error;
  }
};
