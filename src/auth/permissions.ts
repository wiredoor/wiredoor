export const Actions = ['create', 'read', 'update', 'delete'] as const;
export type Action = (typeof Actions)[number];

export const Subjects = [
  'User',
  'Role',
  'Node',
  'HTTPService',
  'TCPService',
  'Domain',
] as const;
export type Subject = (typeof Subjects)[number];

export const Scopes = ['any', 'own'] as const;
export type Scope = (typeof Scopes)[number];

export type PermissionKey = `${Action}:${Subject}:${Scope}`;

export type PermissionItem = {
  [key in PermissionKey]?: {
    description: string;
  };
};

export const PermissionCatalog: PermissionItem = {
  // User
  'create:User:any': { description: 'Create user' },
  'read:User:own': { description: 'Read own users' },
  'read:User:any': { description: 'Read all users' },
  'update:User:own': { description: 'Update own users' },
  'update:User:any': { description: 'Update all users' },
  'delete:User:own': { description: 'Delete own users' },
  'delete:User:any': { description: 'Delete all users' },
  // Role
  'create:Role:any': { description: 'Create role' },
  'read:Role:own': { description: 'Read own roles' },
  'read:Role:any': { description: 'Read all roles' },
  'update:Role:own': { description: 'Update own roles' },
  'update:Role:any': { description: 'Update all roles' },
  'delete:Role:own': { description: 'Delete own roles' },
  'delete:Role:any': { description: 'Delete all roles' },
  // Node
  'create:Node:any': { description: 'Create node' },
  'read:Node:own': { description: 'Read own nodes' },
  'read:Node:any': { description: 'Read all nodes' },
  'update:Node:own': { description: 'Update own nodes' },
  'update:Node:any': { description: 'Update all nodes' },
  'delete:Node:own': { description: 'Delete own nodes' },
  'delete:Node:any': { description: 'Delete all nodes' },
  // Domain
  'create:Domain:any': { description: 'Create domain' },
  'read:Domain:own': { description: 'Read own domains' },
  'read:Domain:any': { description: 'Read all domains' },
  'update:Domain:own': { description: 'Update own domains' },
  'update:Domain:any': { description: 'Update all domains' },
  'delete:Domain:own': { description: 'Delete own domains' },
  'delete:Domain:any': { description: 'Delete all domains' },
  // HTTP Service
  'create:HTTPService:any': { description: 'Create HTTP Service' },
  'read:HTTPService:own': { description: 'Read own HTTP Services' },
  'read:HTTPService:any': { description: 'Read all HTTP Services' },
  'update:HTTPService:own': { description: 'Update own HTTP Services' },
  'update:HTTPService:any': { description: 'Update all HTTP Services' },
  'delete:HTTPService:own': { description: 'Delete own HTTP Services' },
  'delete:HTTPService:any': { description: 'Delete all HTTP Services' },
  // TCP Service
  'create:TCPService:any': { description: 'Create TCP Service' },
  'read:TCPService:own': { description: 'Read own TCP Services' },
  'read:TCPService:any': { description: 'Read all TCP Services' },
  'update:TCPService:own': { description: 'Update own TCP Services' },
  'update:TCPService:any': { description: 'Update all TCP Services' },
  'delete:TCPService:own': { description: 'Delete own TCP Services' },
  'delete:TCPService:any': { description: 'Delete all TCP Services' },
} as const;
