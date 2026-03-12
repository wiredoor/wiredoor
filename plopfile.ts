import type {
  Actions,
  CustomActionFunction,
  ModifyActionConfig,
  NodePlopAPI,
} from 'plop';
import { type PromptQuestion } from 'node-plop';
import { type Answers } from 'inquirer';
import { execSync } from 'node:child_process';
import pluralize from 'pluralize/pluralize.js';

function assertKebabCase(input: string) {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(input);
}

function pascalFromKebab(str: string) {
  return str
    .split('-')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

function kebab(str: string) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function camelFromKebab(str: string) {
  const p = pascalFromKebab(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function snakeFromKebab(str: string) {
  return str.replace(/-/g, '_');
}

function baseResourcePrompts(): PromptQuestion[] {
  return [
    {
      type: 'input',
      name: 'resource',
      message: 'Resource (kebab-case). E.g.: remote-node',
      validate: (v: string) =>
        assertKebabCase(v) ? true : 'Must be kebab-case (e.g. remote-node)',
    },
  ] as const;
}

function deriveResource(a: Answers) {
  const resource = kebab(a.resource.trim());
  if (!assertKebabCase(resource)) {
    throw new Error(`Invalid resource "${a.resource}" (must be kebab-case)`);
  }

  const Model = pascalFromKebab(resource);
  const modelVar = camelFromKebab(resource);

  const defaultTable = pluralize(snakeFromKebab(resource));
  const defaultRoute = pluralize(resource);

  return { resource, Model, modelVar, defaultTable, defaultRoute };
}

export default function (plop: NodePlopAPI) {
  // Helpers for HBS
  plop.setHelper('pascal', (v: string) => pascalFromKebab(kebab(v)));
  plop.setHelper('kebab', (v: string) => kebab(v));
  plop.setHelper('camel', (v: string) => camelFromKebab(kebab(v)));
  plop.setHelper('snake', (v: string) => snakeFromKebab(kebab(v)));

  // Action: shell
  plop.setActionType('shell', (answers, cfg) => {
    const cmd =
      typeof cfg.command === 'function' ? cfg.command(answers) : cfg.command;
    execSync(cmd, { stdio: 'inherit' });
    return `Executed: ${cmd}`;
  });

  const CONTROLLERS_INDEX_PATH = 'src/controllers/index.ts';

  // --------------------------
  // Layer generators (resource-based)
  // --------------------------

  plop.setGenerator('entity', {
    description: 'Create only the entity (TypeORM model).',
    prompts: [
      ...baseResourcePrompts(),
      {
        type: 'input',
        name: 'table',
        message: 'Table override (optional). E.g.: remote_nodes',
        default: '',
      },
    ],
    actions: (a) => {
      const d = deriveResource(a);
      const table = a.table?.trim() || d.defaultTable;

      return [
        {
          type: 'add',
          path: `src/database/models/${d.resource}.ts`,
          templateFile: '.plop/resources/entity.hbs',
          data: { Model: d.Model, table },
          skipIfExists: true,
        },
      ] satisfies Actions;
    },
  });

  plop.setGenerator('repository', {
    description: 'Create repository (+ optional filter).',
    prompts: [
      ...baseResourcePrompts(),
      {
        type: 'confirm',
        name: 'withFilter',
        message: 'Also create filter file?',
        default: true,
      },
    ],
    actions: (a) => {
      const d = deriveResource(a);

      const actions: Actions = [
        {
          type: 'add',
          path: `src/repositories/${d.resource}-repository.ts`,
          templateFile: '.plop/resources/repository.hbs',
          data: { Model: d.Model },
          skipIfExists: true,
        },
      ];

      if (a.withFilter) {
        actions.push({
          type: 'add',
          path: `src/repositories/filters/${d.resource}-query-filter.ts`,
          templateFile: '.plop/resources/filter.hbs',
          data: { Model: d.Model },
          skipIfExists: true,
        });
      }

      return actions;
    },
  });

  plop.setGenerator('schema', {
    description: 'Create only the schema (typed DTO + Joi validators).',
    prompts: baseResourcePrompts(),
    actions: (a) => {
      const d = deriveResource(a);
      return [
        {
          type: 'add',
          path: `src/schemas/${d.resource}-schemas.ts`,
          templateFile: '.plop/resources/schema.hbs',
          data: { Model: d.Model },
          skipIfExists: true,
        },
      ] satisfies Actions;
    },
  });

  plop.setGenerator('service', {
    description: 'Create only the service.',
    prompts: baseResourcePrompts(),
    actions: (a) => {
      const d = deriveResource(a);
      return [
        {
          type: 'add',
          path: `src/services/${d.resource}-service.ts`,
          templateFile: '.plop/resources/service.hbs',
          data: { Model: d.Model },
          skipIfExists: true,
        },
      ] satisfies Actions;
    },
  });

  plop.setGenerator('controller', {
    description: 'Create only the controller (+ optional registry).',
    prompts: [
      ...baseResourcePrompts(),
      {
        type: 'input',
        name: 'route',
        message:
          'Route override (optional, without leading "/"). E.g.: remote-nodes',
        default: '',
      },
      {
        type: 'confirm',
        name: 'registerController',
        message: `Update ${CONTROLLERS_INDEX_PATH} (manual registry)?`,
        default: true,
      },
    ],
    actions: (a) => {
      const d = deriveResource(a);
      const route = a.route?.trim() || d.defaultRoute;

      const ControllerClass = `${d.Model}Controller`;

      const actions: Actions = [
        {
          type: 'add',
          path: `src/controllers/${d.resource}-controller.ts`,
          templateFile: '.plop/resources/controller.hbs',
          data: { Model: d.Model, route },
          skipIfExists: true,
        },
      ];

      if (a.registerController) {
        actions.push({
          type: 'modify',
          path: CONTROLLERS_INDEX_PATH,
          pattern: /\/\/\s*PLOP_IMPORTS/g,
          template: `import ${ControllerClass} from './${d.resource}-controller';\n// PLOP_IMPORTS`,
        } as ModifyActionConfig);

        actions.push({
          type: 'modify',
          path: CONTROLLERS_INDEX_PATH,
          pattern: /\/\/\s*PLOP_CONTROLLERS/g,
          template: `${ControllerClass},\n  // PLOP_CONTROLLERS`,
        } as ModifyActionConfig);
      }

      return actions;
    },
  });

  // --------------------------
  // Full resource generator (composes layers)
  // --------------------------
  plop.setGenerator('resource', {
    description:
      'Generate entity/repository/filter/schema/service/controller + optional migration + optional controller registration.',
    prompts: [
      ...baseResourcePrompts(),
      {
        type: 'input',
        name: 'table',
        message: 'Table override (optional). E.g.: remote_nodes',
        default: '',
      },
      {
        type: 'input',
        name: 'route',
        message:
          'Route override (optional, without leading "/"). E.g.: remote-nodes',
        default: '',
      },
      {
        type: 'confirm',
        name: 'generateMigration',
        message: 'Generate migration now?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'registerController',
        message: `Update ${CONTROLLERS_INDEX_PATH} (manual registry)?`,
        default: true,
      },
    ],
    actions: (a) => {
      const d = deriveResource(a);

      const table = a.table?.trim() || d.defaultTable;
      const route = a.route?.trim() || d.defaultRoute;

      const ControllerClass = `${d.Model}Controller`;

      const actions: Actions = [
        // entity
        {
          type: 'add',
          path: `src/database/models/${d.resource}.ts`,
          templateFile: '.plop/resources/entity.hbs',
          data: { Model: d.Model, table },
          skipIfExists: true,
        },

        // repo + filter
        {
          type: 'add',
          path: `src/repositories/${d.resource}-repository.ts`,
          templateFile: '.plop/resources/repository.hbs',
          data: { Model: d.Model },
          skipIfExists: true,
        },
        {
          type: 'add',
          path: `src/repositories/filters/${d.resource}-query-filter.ts`,
          templateFile: '.plop/resources/filter.hbs',
          data: { Model: d.Model },
          skipIfExists: true,
        },

        // schema
        {
          type: 'add',
          path: `src/schemas/${d.resource}-schemas.ts`,
          templateFile: '.plop/resources/schema.hbs',
          data: { Model: d.Model },
          skipIfExists: true,
        },

        // service
        {
          type: 'add',
          path: `src/services/${d.resource}-service.ts`,
          templateFile: '.plop/resources/service.hbs',
          data: { Model: d.Model },
          skipIfExists: true,
        },

        // controller
        {
          type: 'add',
          path: `src/controllers/${d.resource}-controller.ts`,
          templateFile: '.plop/resources/controller.hbs',
          data: { Model: d.Model, route },
          skipIfExists: true,
        },
      ];

      if (a.registerController) {
        actions.push({
          type: 'modify',
          path: CONTROLLERS_INDEX_PATH,
          pattern: /\/\/\s*PLOP_IMPORTS/g,
          template: `import ${ControllerClass} from './${d.resource}-controller';\n// PLOP_IMPORTS`,
        } as ModifyActionConfig);

        actions.push({
          type: 'modify',
          path: CONTROLLERS_INDEX_PATH,
          pattern: /\/\/\s*PLOP_CONTROLLERS/g,
          template: `${ControllerClass},\n  // PLOP_CONTROLLERS`,
        } as ModifyActionConfig);
      }

      if (a.generateMigration) {
        actions.push({
          type: 'shell',
          command: () =>
            `npm run migration:create src/database/migrations/create-${table}-table`,
        } as unknown as CustomActionFunction);
      }

      return actions;
    },
  });

  // --------------------------
  // Misc generators (non-resource)
  // --------------------------

  plop.setGenerator('middleware', {
    description:
      'Create a middleware (routing-controllers UseBefore) scaffold.',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Middleware name (kebab-case). E.g.: admin-token',
        validate: (v: string) =>
          assertKebabCase(kebab(v))
            ? true
            : 'Must be kebab-case (e.g. admin-token)',
      },
    ],
    actions: (a) => {
      const name = kebab(a.name.trim());
      const Model = pascalFromKebab(name);
      return [
        {
          type: 'add',
          path: `src/middlewares/${name}-middleware.ts`,
          templateFile: '.plop/misc/middleware.hbs',
          data: { Name: Model },
          skipIfExists: true,
        },
      ] satisfies Actions;
    },
  });

  plop.setGenerator('script', {
    description: 'Create a script (node/ts) scaffold.',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Script name (kebab-case). E.g.: backfill-nodes',
        validate: (v: string) =>
          assertKebabCase(kebab(v))
            ? true
            : 'Must be kebab-case (e.g. backfill-nodes)',
      },
    ],
    actions: (a) => {
      const name = kebab(a.name.trim());
      return [
        {
          type: 'add',
          path: `src/scripts/${name}.ts`,
          templateFile: '.plop/misc/script.hbs',
          data: { name },
          skipIfExists: true,
        },
      ] satisfies Actions;
    },
  });
}
