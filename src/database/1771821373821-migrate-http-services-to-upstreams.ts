import { MigrationInterface, QueryRunner } from 'typeorm';
import { RuleMatchType } from '../schemas/http-resource-schemas';

function safeJsonParse<T>(value: any, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return fallback;
  const s = value.trim();
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function normalizeLines(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !!l);
}

function isValidBypassLine(route: string): boolean {
  // same constraints you already used
  if (route.startsWith('@')) return false;
  if (!route.startsWith('/') && !route.startsWith('^')) return false;
  return true;
}

function parseBypassLine(
  route: string,
): { matchType: RuleMatchType; pattern: string } | null {
  if (!isValidBypassLine(route)) return null;
  if (route.startsWith('^')) return { matchType: 'regex', pattern: route };
  // in the old code: "/x" became "location = /x" (exact)
  // keep same semantics for migrated bypass routes:
  if (route.startsWith('/')) return { matchType: 'exact', pattern: route };
  return null;
}

export class MigrateHttpServicesToUpstreams1771821373821 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const httpServices: Array<{
      id: number;
      serviceName: string | null;
      domain: string | null;
      pathLocation: string | null;
      backendHost: string | null;
      backendPort: number | null;
      backendProto: string | null;
      enabled: number | boolean | null;
      requireAuth: number | boolean | null;
      skipAuthRoutes: string | null;
      allowedIps: string | null; // could be JSON or newline/csv depending on old schema
      blockedIps: string | null; // same
      expiresAt: string | null;
      createdAt: string | null;
      updatedAt: string | null;
      nodeId: number | null;
      nodeName: string | null;
      oauth2Config: string | null; // json text
    }> = await queryRunner.query(`
      SELECT
        hs.id,
        hs."name"           as "serviceName",
        hs."domain"         as "domain",
        hs."pathLocation"   as "pathLocation",
        hs."backendHost"    as "backendHost",
        hs."backendPort"    as "backendPort",
        hs."backendProto"   as "backendProto",
        hs."enabled"        as "enabled",
        hs."requireAuth"    as "requireAuth",
        hs."skipAuthRoutes" as "skipAuthRoutes",
        hs."allowedIps"     as "allowedIps",
        hs."blockedIps"     as "blockedIps",
        hs."expiresAt"      as "expiresAt",
        hs."created_at"     as "createdAt",
        hs."updated_at"     as "updatedAt",
        hs."nodeId"         as "nodeId",
        n."name"            as "nodeName",
        d."oauth2Config"    as "oauth2Config"
      FROM "http_services" hs
      LEFT JOIN "nodes" n ON hs."nodeId" = n."id"
      LEFT JOIN "domains" d ON hs."domain" = d."domain"
    `);

    // Create OIDC Provider from OAUTH2_PROXY env vars if exists
    const providerId = await this.ensureOidcProviderFromEnv(queryRunner);

    // Group http services by domain
    const byDomain = new Map<string, typeof httpServices>();
    for (const s of httpServices) {
      const domain = (s.domain || '').trim();
      if (!domain) continue;
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain)!.push(s);
    }

    for (const [domain, services] of byDomain.entries()) {
      // Prefer oauth2Config from any row that has it
      const oauth2Config = safeJsonParse<any>(
        services.find((x) => x.oauth2Config)?.oauth2Config,
        {},
      );

      const allowedEmails: string[] = Array.isArray(oauth2Config?.allowedEmails)
        ? oauth2Config.allowedEmails
        : [];

      // Create HTTP Resource in new table http_resources
      const httpResourceId = await this.ensureHttpResource(
        queryRunner,
        domain,
        services,
        providerId,
      );

      for (const svc of services) {
        const enabled = svc.enabled === true || svc.enabled === 1;

        if (!enabled) continue;

        // Create Upstream in new table http_upstreams
        await queryRunner.query(
          `INSERT INTO "http_upstreams"
            ("type","pathPattern","rewrite","targetProtocol","targetHost","targetPort","targetSslVerify","targetNodeId","httpResourceId","created_at","updated_at")
          VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `,
          [
            // httpResourceId will be set after we get the inserted id, for now set to null and update later
            'prefix', // default to prefix, as old http_service did not have this concept
            svc.pathLocation || '/',
            null, // no rewrite in old http_service
            svc.backendProto === 'https' ? 'https' : 'http',
            svc.backendHost || '127.0.0.1',
            svc.backendPort || 80,
            false, // no ssl verify option in old http_service
            svc.nodeName !== 'Wiredoor_Local' ? svc.nodeId : null,
            httpResourceId,
            svc.createdAt,
          ],
        );

        // Create Access Rules if requireAuth is true
        const requireAuth = svc.requireAuth === true || svc.requireAuth === 1;

        if (requireAuth) {
          const bypass = normalizeLines(svc.skipAuthRoutes)
            .filter(isValidBypassLine)
            .map(parseBypassLine)
            .filter(
              (x): x is { matchType: RuleMatchType; pattern: string } => !!x,
            );
          const bypassKeyed = new Set<string>();

          for (const b of bypass) {
            const key = `${b.matchType}:${b.pattern}`;
            if (bypassKeyed.has(key)) continue; // avoid duplicates
            bypassKeyed.add(key);

            await queryRunner.query(
              `INSERT INTO "http_resource_access_rules"
                ("httpResourceId","enabled","order","matchType","pattern","action","predicate","created_at","updated_at")
              VALUES
              (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              `,
              [
                httpResourceId,
                1,
                bypass.indexOf(b) + 1,
                b.matchType,
                b.pattern,
                'public',
                null, // no complex predicate in old http_service, just simple bypass rules
              ],
            );
          }
        }
      }

      // Create Edge Rules if allowedIps or blockedIps exist
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

  private async ensureOidcProviderFromEnv(
    queryRunner: QueryRunner,
  ): Promise<number | null> {
    const provider = (process.env.OAUTH2_PROXY_PROVIDER || '')
      .trim()
      .toLowerCase();
    const clientId = (process.env.OAUTH2_PROXY_CLIENT_ID || '').trim();
    const clientSecret = (process.env.OAUTH2_PROXY_CLIENT_SECRET || '').trim();
    const issuerUrlEnv = (
      process.env.OAUTH2_PROXY_OIDC_ISSUER_URL || ''
    ).trim();

    if (!provider || !clientId || !clientSecret) return null;

    let type: 'google' | 'keycloak' | 'azuread' | 'generic' | null = null;
    let issuerUrl = issuerUrlEnv;

    if (provider === 'google') {
      type = 'google';
      issuerUrl = issuerUrl || 'https://accounts.google.com';
    } else if (provider.includes('keycloak')) {
      type = 'keycloak';
      // issuerUrl must come from env for keycloak
      if (!issuerUrl) return null;
    } else if (
      provider.includes('azure') ||
      provider.includes('entra') ||
      provider === 'azuread'
    ) {
      type = 'azuread';
      issuerUrl = issuerUrl || 'https://login.microsoftonline.com/common/v2.0';
      if (!issuerUrl) return null;
    } else if (provider.includes('oidc') || provider.includes('openid')) {
      type = 'generic';
      if (!issuerUrl) return null;
    } else {
      // unsupported → do not create
      return null;
    }

    // unique index: (type, issuer_url, client_id)
    const existing: Array<{ id: number }> = await queryRunner.query(
      `SELECT "id" as "id" FROM "oidc_providers" WHERE "type" = ? AND "issuer_url" = ? AND "client_id" = ? LIMIT 1`,
      [type, issuerUrl, clientId],
    );

    if (existing[0]?.id) return existing[0].id;

    const name = `${type.toUpperCase()} (migrated)`;
    const scopes = 'openid profile email';

    await queryRunner.query(
      `
      INSERT INTO "oidc_providers"
        ("type","name","issuer_url","client_id","client_secret_enc","scopes","claim_mappings","extra_params","enabled","rev","created_at","updated_at")
      VALUES
        (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
      `,
      [
        type,
        name,
        issuerUrl,
        clientId,
        clientSecret,
        scopes,
        JSON.stringify({}), // claim mappings default
        JSON.stringify({}), // extra params default
        1,
        1,
      ],
    );

    const created: Array<{ id: number }> = await queryRunner.query(
      `SELECT "id" as "id" FROM "oidc_providers" WHERE "type" = ? AND "issuer_url" = ? AND "client_id" = ? LIMIT 1`,
      [type, issuerUrl, clientId],
    );

    return created[0]?.id ?? null;
  }

  private async ensureHttpResource(
    queryRunner: QueryRunner,
    domain: string,
    services: any[],
    providerId: number | null,
  ): Promise<number> {
    const existing: Array<{ id: number }> = await queryRunner.query(
      `SELECT "id" as "id" FROM "http_resources" WHERE "domain" = ? LIMIT 1`,
      [domain],
    );
    if (existing[0]?.id) return existing[0].id;

    await queryRunner.query(
      `INSERT INTO "http_resources"
        ("name","domain","enabled","expiresAt","oidcProviderId","created_at","updated_at")
      VALUES
      (?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      [
        `${services[0].serviceName || `${domain}-resource`}`,
        domain,
        services.some((s) => s.enabled) ? 1 : 0,
        services.some((s) => s.expiresAt)
          ? services.find((s) => s.expiresAt)?.expiresAt
          : null,
        services.some((s) => s.requireAuth) && providerId ? providerId : null,
        services[0].createdAt,
      ],
    );

    const created: Array<{ id: number }> = await queryRunner.query(
      `SELECT "id" as "id" FROM "http_resources" WHERE "domain" = ? LIMIT 1`,
      [domain],
    );
    if (!created[0]?.id)
      throw new Error(`Failed to create http_resource for domain ${domain}`);
    return created[0].id;
  }
}
