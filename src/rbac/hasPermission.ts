export const hasPermission = (
  userPermissions: string[],
  requiredPermission: string,
) => {
  if (userPermissions.includes("*")) return true;

  const [resource] = requiredPermission.split(":");

  if (userPermissions.includes(`${resource}:*`)) return true;

  return userPermissions.includes(requiredPermission);
};
