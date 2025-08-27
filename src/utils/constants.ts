const ROLE_ADMIN = 'admin';
const ROLE_OPERATOR = 'operator';
const ROLE_VIEWER = 'viewer';

const USER_ROLES = [ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER] as const;

const ROLE_LABELS: Record<(typeof USER_ROLES)[number], string> = {
  [ROLE_ADMIN]: 'Administrator',
  [ROLE_OPERATOR]: 'Operator',
  [ROLE_VIEWER]: 'Viewer',
};

export { USER_ROLES, ROLE_LABELS, ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER };
