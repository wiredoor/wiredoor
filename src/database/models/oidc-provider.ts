import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OidcProvidersType } from '../../schemas/oidc-provider-schemas';

@Entity('oidc_providers')
@Index(['type', 'issuerUrl', 'clientId'], { unique: true })
@Index(['enabled'])
export class OidcProvider {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  type!: OidcProvidersType;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'issuer_url', type: 'text' })
  issuerUrl!: string;

  @Column({ name: 'client_id', type: 'text' })
  clientId!: string;

  @Column({ name: 'client_secret_enc', type: 'text' })
  clientSecretEnc!: string;

  @Column({ type: 'text', default: 'openid profile email' })
  scopes!: string;

  /**
   * Normalization layer: map provider-specific claim paths -> canonical fields.
   * Canonical targets you should support in code:
   * - subject, email, username, name, groups, roles
   *
   * Values are JSON pointer-ish or dot-path (choose ONE and stick to it).
   * Example (Keycloak):
   * {
   *   "subject": "sub",
   *   "email": "email",
   *   "username": "preferred_username",
   *   "groups": "groups",
   *   "roles": "realm_access.roles"
   * }
   */
  @Column({ name: 'claim_mappings', type: 'json', default: () => "'{}'" })
  claimMappings!: Record<string, string>;

  /**
   * Extra params for the auth request (provider-specific), kept as string map.
   * Examples: prompt, acr_values, login_hint, hd, resource, tenant, etc.
   */
  @Column({ name: 'extra_params', type: 'json', default: () => "'{}'" })
  extraParams!: Record<string, string>;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ nullable: true, unique: true })
  externalId?: string;

  @Column({ type: 'integer', default: 1 })
  rev!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
