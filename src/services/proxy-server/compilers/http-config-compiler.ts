import { NginxConf } from '../conf/nginx-conf';
import { NginxLocationConf } from '../conf/nginx-location-conf';

import type { HttpResource } from '../../../database/models/http-resource';
import type { HttpUpstream } from '../../../database/models/http-upstream';
import type { HttpAccessRuleEntity } from '../../../database/models/http-access-rules';
import type { HttpEdgeRuleEntity } from '../../../database/models/http-edge-rules';
import IP_CIDR from '../../../utils/ip-cidr';
import {
  ConfigFragment,
  NginxCompiler,
  NginxConfigCompiler,
} from './nginx-compiler';

export class HttpConfigCompiler
  extends NginxConfigCompiler
  implements NginxCompiler<HttpResource>
{
  getResourceKey(resource: HttpResource): string {
    return resource.name;
  }

  compile(resource: HttpResource): ConfigFragment[] {
    const fragments: ConfigFragment[] = [];

    const upstreams = resource.httpUpstreams ?? [];
    const accessRules = (resource.accessRules ?? []).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    const edgeRules = (resource.edgeRules ?? []).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    // 1. Rate limit zones (http context)
    const zones = this.compileRateLimitZones(edgeRules, resource);
    if (zones) {
      fragments.push({
        scope: 'http-zones',
        relativePath: `${this.safeDomain(resource.domain)}.conf`,
        content: zones,
      });
    }

    // 2. Location blocks
    const locConf = new NginxConf();
    locConf.addBlock(
      `# HttpResource: ${resource.name} (${resource.domain})`,
      '',
    );

    for (const upstream of upstreams) {
      const directive = this.toLocationDirective(upstream);
      const matchingAccess = accessRules.filter((r) =>
        this.ruleMatchesUpstream(r, upstream),
      );
      const matchingEdge = edgeRules.filter((r) =>
        this.ruleMatchesUpstream(r, upstream),
      );

      const location = this.compileLocation(
        upstream,
        matchingAccess,
        matchingEdge,
      );

      locConf.addBlock(`location ${directive}`, location.getConf());
    }

    fragments.push({
      scope: 'http-locations',
      relativePath: `${this.safeDomain(resource.domain)}/__main.conf`,
      content: locConf.getNginxConf(),
    });

    return fragments;
  }

  getFragmentPaths(resource: HttpResource): ConfigFragment[] {
    return [
      {
        scope: 'http-zones',
        relativePath: `${this.safeDomain(resource.domain)}.conf`,
        content: '',
      },
      {
        scope: 'http-locations',
        relativePath: `${this.safeDomain(resource.domain)}/__main.conf`,
        content: '',
      },
    ];
  }

  async onDeleted(resource: HttpResource): Promise<void> {
    // Close TCP connections to this resource's domain
    for (const upstream of resource.httpUpstreams ?? []) {
      const iface = upstream.node?.wgInterface;
      const server = upstream.node?.address;
      const port = upstream.targetPort;

      if (iface && server && port) {
        await this.resetTCPConnections(iface, server, port);
      }
    }
  }

  // Single location
  private compileLocation(
    upstream: HttpUpstream,
    accessRules: HttpAccessRuleEntity[],
    edgeRules: HttpEdgeRuleEntity[],
  ): NginxLocationConf {
    const loc = new NginxLocationConf();

    // IP rules
    const ipDirectives = this.compileIpDirectives(edgeRules);
    if (ipDirectives.length) {
      loc.addBlock('# IP access control', '');
      for (const d of ipDirectives) {
        loc.addBlock(d.directive, d.value);
      }
    }

    // Rate limiting
    this.applyRateLimiting(loc, edgeRules);

    // Return (short-circuit)
    if (this.applyReturn(loc, edgeRules)) return loc;

    // Custom body size
    this.applyBodySize(loc, edgeRules);

    // Auth
    this.applyAccessRules(loc, accessRules);

    // Request headers
    this.applyRequestHeaders(loc, edgeRules);

    // Proxy
    this.applyProxy(loc, upstream);

    // Response headers
    this.applyResponseHeaders(loc, edgeRules);

    return loc;
  }

  // Directive builders

  private applyRateLimiting(
    loc: NginxLocationConf,
    rules: HttpEdgeRuleEntity[],
  ): void {
    const rlRules = rules.filter(
      (r) => r.enabled !== false && r.action?.type === 'rate_limit.req',
    );
    if (!rlRules.length) return;

    loc.addBlock('# Rate limiting', '');
    for (const rule of rlRules) {
      const p = rule.action.params as any;
      const burst = p.burst ? ` burst=${p.burst}` : '';
      const nodelay = p.nodelay ? ' nodelay' : '';
      loc.addBlock(
        'limit_req',
        `zone=${p.zone ?? 'default'}${burst}${nodelay}`,
      );
      loc.addBlock('limit_req_status', `${p.status ?? 429}`);
    }
  }

  private applyReturn(
    loc: NginxLocationConf,
    rules: HttpEdgeRuleEntity[],
  ): boolean {
    const rule = rules.find(
      (r) => r.enabled !== false && r.action?.type === 'return',
    );
    if (!rule) return false;

    const p = rule.action.params as any;
    const body = p.body ? ` "${this.escapeNginxString(p.body)}"` : '';
    loc.addBlock('return', `${p.code}${body}`);
    return true;
  }

  private applyBodySize(
    loc: NginxLocationConf,
    rules: HttpEdgeRuleEntity[],
  ): void {
    const rule = rules.find(
      (r) => r.enabled !== false && r.action?.type === 'client.max_body_size',
    );
    if (!rule) return;

    const p = rule.action.params as { size: string };
    loc.addBlock('client_max_body_size', `${p.size}`);
  }

  private applyAccessRules(
    loc: NginxLocationConf,
    rules: HttpAccessRuleEntity[],
  ): void {
    const first = rules.find((r) => r.enabled !== false);
    if (!first) return;

    switch (first.action) {
      case 'require_auth':
        loc.addBlock('# Authentication required', '');
        loc.setAuthRequired();
        break;
      case 'deny':
        loc.addBlock('return', `${(first as any).params?.status ?? 403}`);
        break;
      // 'public' → no directives
    }
  }

  private applyRequestHeaders(
    loc: NginxLocationConf,
    rules: HttpEdgeRuleEntity[],
  ): void {
    const hdrRules = rules.filter(
      (r) => r.enabled !== false && r.action?.type === 'request.header.set',
    );
    if (!hdrRules.length) return;

    loc.addBlock('# Request headers', '');
    for (const rule of hdrRules) {
      const p = rule.action.params as any;
      loc.addBlock(
        `proxy_set_header ${p.name}`,
        `"${this.escapeNginxString(p.value)}"`,
      );
    }
  }

  private applyProxy(loc: NginxLocationConf, upstream: HttpUpstream): void {
    loc.addBlock('# Proxy', '');
    loc.includeCommonProxySettings();

    let host = upstream.node?.address;

    if (upstream.node?.isGateway || !upstream.targetNodeId) {
      host = upstream.targetHost ?? host;

      if (upstream.node?.isGateway && !IP_CIDR.isValidIP(host)) {
        loc.setResolver(upstream.node.address);
      }
    }

    const varName = `$target_${this.sanitizeVarName(String(upstream.id))}`;
    loc.addBlock(`set ${varName}`, host);
    loc.setProxyPass(
      `${upstream.targetProtocol}://${varName}:${upstream.targetPort}`,
    );

    if (upstream.targetProtocol === 'https' && !upstream.targetSslVerify) {
      loc.setProxySslVerify('off');
    }

    if (upstream.rewrite) {
      loc.addBlock(
        'rewrite',
        `${upstream.rewrite.pattern} ${upstream.rewrite.replacement} ${upstream.rewrite.flag ?? ''}`,
      );
    }
  }

  private applyResponseHeaders(
    loc: NginxLocationConf,
    rules: HttpEdgeRuleEntity[],
  ): void {
    const hdrRules = rules.filter(
      (r) => r.enabled !== false && r.action?.type === 'response.header.set',
    );
    if (!hdrRules.length) return;

    loc.addBlock('# Response headers', '');
    for (const rule of hdrRules) {
      const p = rule.action.params as any;
      const always = p.always ? ' always' : '';
      loc.addBlock(
        'add_header',
        `${p.name} "${this.escapeNginxString(p.value)}"${always}`,
      );
    }
  }

  // Rate limit zones (http context)

  private compileRateLimitZones(
    rules: HttpEdgeRuleEntity[],
    resource: HttpResource,
  ): string | null {
    const rlRules = rules.filter(
      (r) => r.enabled !== false && r.action?.type === 'rate_limit.req',
    );
    if (!rlRules.length) return null;

    const zones = new Set<string>();
    const lines = [
      `# Rate limit zones for ${resource.name} (${resource.domain})`,
    ];

    for (const rule of rlRules) {
      const p = rule.action.params as any;
      const zone = p.zone ?? 'default';
      if (zones.has(zone)) continue;
      zones.add(zone);
      lines.push(
        `limit_req_zone ${p.key ?? '$binary_remote_addr'} zone=${zone}:10m rate=${p.rate ?? '10r/s'};`,
      );
    }

    return lines.join('\n');
  }

  // Matching

  private ruleMatchesUpstream(
    rule: { matchType: string; pattern: string },
    upstream: HttpUpstream,
  ): boolean {
    switch (rule.matchType) {
      case 'prefix':
        return (
          upstream.pathPattern.startsWith(rule.pattern) || rule.pattern === '/'
        );
      case 'exact':
        return upstream.pathPattern === rule.pattern;
      case 'regex':
        try {
          return new RegExp(rule.pattern, 'i').test(upstream.pathPattern);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private toLocationDirective(upstream: HttpUpstream): string {
    switch (upstream.type) {
      case 'exact':
        return `= ${upstream.pathPattern}`;
      case 'regex':
        return `~ ${upstream.pathPattern}`;
      default:
        return upstream.pathPattern;
    }
  }
}
