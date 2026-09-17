export const hasRole = (roles = [], role) => {
  return roles.includes(role);
};

export const hasPermission = (permissions = [], permission) => {
  return permissions.includes(permission);
};

export const hasAnyPermission = (permissions = [], requiredPermissions = []) => {
  return requiredPermissions.some((item) => permissions.includes(item));
};

export const hasAllPermissions = (permissions = [], requiredPermissions = []) => {
  return requiredPermissions.every((item) => permissions.includes(item));
};