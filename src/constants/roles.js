export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  REPOSITOR: 'repositor',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.SUPERVISOR]: 'Supervisor',
  [ROLES.REPOSITOR]: 'Repositor',
};

export const ROLE_DEFAULT_ROUTES = {
  [ROLES.ADMIN]: '/dashboard',
  [ROLES.SUPERVISOR]: '/dashboard',
  [ROLES.REPOSITOR]: '/dashboard',
};
