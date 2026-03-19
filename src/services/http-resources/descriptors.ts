import { EntityManager } from 'typeorm';

import {
  SubEntityDescriptor,
  ResolveContext,
} from '../../core/declarative/sub-entity-reconciler';

import { HttpUpstreamRepository } from '../../repositories/http-upstream-repository';
import { HttpAccessRuleRepository } from '../../repositories/http-access-rule-repository';
import { HttpEdgeRuleRepository } from '../../repositories/http-edge-rule-repository';

import { HttpUpstream } from '../../database/models/http-upstream';
import { HttpAccessRuleEntity } from '../../database/models/http-access-rules';
import { HttpEdgeRuleEntity } from '../../database/models/http-edge-rules';

import type {
  HttpUpstreamSpec,
  AccessRuleSpec,
  EdgeRuleSpec,
} from '../../schemas/http-resource-schemas';

import { stableStringify } from '../../utils/transformers';

// Helpers

export function normalizeMethods(methods?: string[] | null): string[] | null {
  if (!methods || !methods.length) return null;
  const cleaned = methods.map((m) => m.trim().toUpperCase()).filter(Boolean);
  return cleaned.length ? Array.from(new Set(cleaned)) : null;
}

export function resolveUpstreamId(
  upstreamPathPattern: string | undefined,
  context: ResolveContext,
): number | null {
  if (!upstreamPathPattern) return null;
  const upstreams = context.resolved.get('upstreams');
  if (!upstreams) return null;
  return upstreams.get(upstreamPathPattern)?.id ?? null;
}

// ═══════════════════════════════════════════════════════════════════
// Upstream descriptor
// ═══════════════════════════════════════════════════════════════════

export function createUpstreamDescriptor(
  repo: HttpUpstreamRepository,
): SubEntityDescriptor<HttpUpstreamSpec, HttpUpstream> {
  return {
    name: 'upstreams',

    findByParentId: (parentId, manager?: EntityManager) =>
      repo.find({ where: { httpResourceId: parentId } }, manager),

    save: (payload, manager?: EntityManager) =>
      repo.save(payload as Partial<HttpUpstream>, manager),

    deleteById: async (id, manager?: EntityManager): Promise<void> => {
      await repo.delete(id, manager);
    },

    naturalKeyFromSpec: (spec) => `${spec.type}|${spec.pathPattern}`,

    naturalKeyFromEntity: (entity) => `${entity.type}|${entity.pathPattern}`,

    fingerprintFromSpec: (spec): string => {
      const obj = {
        type: spec.type,
        pathPattern: spec.pathPattern,
        rewrite: spec.rewrite ?? null,
        targetProtocol: spec.targetProtocol,
        targetHost: spec.targetHost || 'localhost',
        targetPort: spec.targetPort,
        targetSslVerify: spec.targetSslVerify ?? false,
        targetNodeId: spec.targetNodeId ?? null,
      };

      // console.log('[upstream] SPEC:', JSON.stringify(obj));

      return stableStringify(obj);
    },

    fingerprintFromEntity: (entity): string => {
      const obj = {
        type: entity.type,
        pathPattern: entity.pathPattern,
        rewrite: entity.rewrite ?? null,
        targetProtocol: entity.targetProtocol,
        targetHost: entity.targetHost || 'localhost',
        targetPort: entity.targetPort,
        targetSslVerify: entity.targetSslVerify ?? false,
        targetNodeId: entity.targetNodeId ?? null,
      };

      // console.log('[upstream] ENTITY:', JSON.stringify(obj));

      return stableStringify(obj);
    },

    toCreatePayload: (spec, parentId) => ({
      httpResourceId: parentId,
      type: spec.type,
      pathPattern: spec.pathPattern,
      rewrite: spec.rewrite,
      targetProtocol: spec.targetProtocol,
      targetHost: spec.targetHost,
      targetPort: spec.targetPort,
      targetSslVerify: spec.targetSslVerify,
      targetNodeId: spec.targetNodeId,
    }),

    toUpdatePayload: (spec, existing, parentId) => ({
      id: existing.id,
      httpResourceId: parentId,
      type: spec.type,
      pathPattern: spec.pathPattern,
      rewrite: spec.rewrite,
      targetProtocol: spec.targetProtocol,
      targetHost: spec.targetHost,
      targetPort: spec.targetPort,
      targetSslVerify: spec.targetSslVerify,
      targetNodeId: spec.targetNodeId,
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════
// Access rule descriptor
// ═══════════════════════════════════════════════════════════════════

export function createAccessRuleDescriptor(
  repo: HttpAccessRuleRepository,
): SubEntityDescriptor<AccessRuleSpec, HttpAccessRuleEntity> {
  return {
    name: 'accessRules',

    findByParentId: (parentId, manager?: EntityManager) =>
      repo.find({ where: { httpResourceId: parentId } }, manager),

    save: (payload, manager?: EntityManager) =>
      repo.save(payload as Partial<HttpAccessRuleEntity>, manager),

    deleteById: async (id, manager?: EntityManager): Promise<void> => {
      await repo.delete(id, manager);
    },

    naturalKeyFromSpec: (spec) =>
      [
        String(spec.order ?? ''),
        spec.when.type,
        spec.when.pathPattern,
        spec.upstreamPathPattern ?? '',
      ].join('|'),

    naturalKeyFromEntity: (entity) =>
      [
        String(entity.order ?? ''),
        entity.matchType,
        entity.pattern,
        String(entity.upstreamId ?? ''),
      ].join('|'),

    fingerprintFromSpec: (spec, context): string => {
      const upstreamId = resolveUpstreamId(spec.upstreamPathPattern, context);
      return stableStringify({
        enabled: spec.enabled ?? true,
        order: spec.order ?? null,
        when: {
          type: spec.when.type,
          pathPattern: spec.when.pathPattern,
          methods: normalizeMethods(spec.when.methods ?? null),
        },
        action: spec.action,
        predicate: spec.predicate ?? null,
        upstreamId: upstreamId ?? null,
      });
    },

    fingerprintFromEntity: (entity) =>
      stableStringify({
        enabled: entity.enabled ?? true,
        order: entity.order ?? null,
        when: {
          type: entity.matchType,
          pathPattern: entity.pattern,
          methods: normalizeMethods(entity.methods ?? null),
        },
        action: entity.action,
        predicate: entity.predicate ?? null,
        upstreamId: entity.upstreamId ?? null,
      }),

    toCreatePayload: (spec, parentId, context) => ({
      httpResourceId: parentId,
      enabled: spec.enabled ?? true,
      order: spec.order ?? null,
      matchType: spec.when.type,
      pattern: spec.when.pathPattern,
      methods: normalizeMethods(spec.when.methods ?? null),
      action: spec.action,
      predicate: spec.predicate ?? null,
      upstreamId: resolveUpstreamId(spec.upstreamPathPattern, context),
      rev: 1,
    }),

    toUpdatePayload: (spec, existing, parentId, context) => ({
      id: existing.id,
      httpResourceId: parentId,
      enabled: spec.enabled ?? true,
      order: spec.order ?? null,
      matchType: spec.when.type,
      pattern: spec.when.pathPattern,
      methods: normalizeMethods(spec.when.methods ?? null),
      action: spec.action,
      predicate: spec.predicate ?? null,
      upstreamId: resolveUpstreamId(spec.upstreamPathPattern, context),
      rev: (existing.rev ?? 1) + 1,
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════
// Edge rule descriptor
// ═══════════════════════════════════════════════════════════════════

export function createEdgeRuleDescriptor(
  repo: HttpEdgeRuleRepository,
): SubEntityDescriptor<EdgeRuleSpec, HttpEdgeRuleEntity> {
  return {
    name: 'edgeRules',

    findByParentId: (parentId, manager?: EntityManager) =>
      repo.find({ where: { httpResourceId: parentId } }, manager),

    save: (payload, manager?: EntityManager) =>
      repo.save(payload as Partial<HttpEdgeRuleEntity>, manager),

    deleteById: async (id, manager?: EntityManager): Promise<void> => {
      await repo.delete(id, manager);
    },

    naturalKeyFromSpec: (spec) =>
      [
        String(spec.order ?? ''),
        spec.when.type,
        spec.when.pathPattern,
        spec.upstreamPathPattern ?? '',
      ].join('|'),

    naturalKeyFromEntity: (entity) =>
      [
        String(entity.order ?? ''),
        entity.matchType,
        entity.pattern,
        String(entity.upstreamId ?? ''),
      ].join('|'),

    fingerprintFromSpec: (spec, context): string => {
      const upstreamId = resolveUpstreamId(spec.upstreamPathPattern, context);
      return stableStringify({
        enabled: spec.enabled ?? true,
        order: spec.order ?? null,
        when: {
          type: spec.when.type,
          pathPattern: spec.when.pathPattern,
          methods: normalizeMethods(spec.when.methods ?? null),
        },
        action: spec.action,
        upstreamId: upstreamId ?? null,
      });
    },

    fingerprintFromEntity: (entity): string =>
      stableStringify({
        enabled: entity.enabled ?? true,
        order: entity.order ?? null,
        when: {
          type: entity.matchType,
          pathPattern: entity.pattern,
          methods: normalizeMethods(entity.methods ?? null),
        },
        action: entity.action,
        upstreamId: entity.upstreamId ?? null,
      }),

    toCreatePayload: (spec, parentId, context) => ({
      httpResourceId: parentId,
      enabled: spec.enabled ?? true,
      order: spec.order ?? null,
      matchType: spec.when.type,
      pattern: spec.when.pathPattern,
      methods: normalizeMethods(spec.when.methods ?? null),
      action: spec.action,
      upstreamId: resolveUpstreamId(spec.upstreamPathPattern, context),
    }),

    toUpdatePayload: (spec, existing, parentId, context) => ({
      id: existing.id,
      httpResourceId: parentId,
      enabled: spec.enabled ?? true,
      order: spec.order ?? null,
      matchType: spec.when.type,
      pattern: spec.when.pathPattern,
      methods: normalizeMethods(spec.when.methods ?? null),
      action: spec.action,
      upstreamId: resolveUpstreamId(spec.upstreamPathPattern, context),
    }),
  };
}
