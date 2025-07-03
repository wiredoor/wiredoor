import { execSync } from 'child_process';

export enum Table {
  filter = 'filter',
  nat = 'nat',
  mangle = 'mangle',
  raw = 'raw',
  security = 'security',
}

export enum Chain {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
  FORWARD = 'FORWARD',
  PREROUTING = 'PREROUTING',
  POSTROUTING = 'POSTROUTING',
}

export enum Target {
  ACCEPT = 'ACCEPT',
  DROP = 'DROP',
  REJECT = 'REJECT',
  LOG = 'LOG',
  MASQUERADE = 'MASQUERADE',
  DNAT = 'DNAT',
  SNAT = 'SNAT',
}

enum IptablesActions {
  ADD = '-A', // Add (Append) Rule
  INSERT = '-I', // Insert Rule
  DELETE = '-D', // Delete Rule
  CHECK = '-C', // Check if Rule exists
  SHOW = '-S', // Show rules
  POLICY = '-P', // Set Policy
  FLUSH = '-F', // Flush all rules
  ZERO = '-Z', // Reset counters
  LIST = '-L', // List rules
  NEW = '-N', // Create new chain
  DELCHAIN = '-X', // Delete chain
  RENAMECHAIN = '-E', // Rename chain
  REPLACE = '-R', // Replace rule
}

type TableStrings = Table;
type ChainStrings = `${Chain}` | string;
type TargetStrigs = Target;

export interface IptablesRule {
  table?: TableStrings;
  chain: ChainStrings;
  protocol?: string;
  inInterface?: string;
  outInterface?: string;
  source?: string;
  destination?: string;
  sport?: string;
  dport?: string;
  target?: TargetStrigs;
  args?: {
    [arg: string]: string;
  };
}

export default class Iptables {
  /**
   * Format iptables json rule to iptables rule string
   * @param rule
   * @returns Iptables rule string
   */
  private static formatRule(
    action: IptablesActions,
    rule: IptablesRule,
  ): string {
    let cmd = `iptables -t ${rule.table ? rule.table : Table.filter} ${action} ${rule.chain}`;
    if (rule.protocol) cmd += ` -p ${rule.protocol}`;
    if (rule.source) cmd += ` -s ${rule.source}`;
    if (rule.destination) cmd += ` -d ${rule.destination}`;
    if (rule.sport) cmd += ` --sport ${rule.sport}`;
    if (rule.dport) cmd += ` --dport ${rule.dport}`;
    if (rule.target) cmd += ` -j ${rule.target}`;
    if (rule.args) {
      for (const arg of Object.keys(rule.args)) {
        cmd += ` ${arg} ${rule.args[arg]}`;
      }
    }
    return cmd;
  }

  static ruleExists(rule: IptablesRule): boolean {
    const cmd = this.formatRule(IptablesActions.CHECK, rule);

    try {
      this.execIptablesCmd(cmd);
      return true;
    } catch {
      return false;
    }
  }

  static showRules(table: TableStrings): string[] {
    try {
      const output = execSync(`iptables -t ${table} -S`).toString();
      return output.trim().split('\n');
    } catch (error) {
      console.error('Error al listar las reglas:', error);
      return [];
    }
  }

  static addRules(rules: IptablesRule[]): boolean {
    let added = null;
    for (const rule of rules) {
      const ruleResult = this.addRule(rule);

      if (added !== false) {
        added = ruleResult;
      }
    }

    return added;
  }

  static addRule(rule: IptablesRule): boolean {
    if (this.ruleExists(rule)) {
      this.debugMessage(`Rule already exists`);
      return true;
    }

    const cmd = this.formatRule(IptablesActions.ADD, rule);
    try {
      this.execIptablesCmd(cmd);
      this.debugMessage(`Rule added: ${JSON.stringify(rule, null, 2)}`);
      return true;
    } catch (error) {
      console.error('Error adding rule:', error);
      return false;
    }
  }

  static deleteRules(rules: IptablesRule[]): boolean {
    let added = null;
    for (const rule of rules) {
      const ruleResult = this.deleteRule(rule);

      if (added !== false) {
        added = ruleResult;
      }
    }

    return added;
  }

  static deleteRule(rule: IptablesRule): boolean {
    if (!this.ruleExists(rule)) {
      this.debugMessage(`Rule doesn't exists`);
      return true;
    }
    const cmd = this.formatRule(IptablesActions.DELETE, rule);

    try {
      this.execIptablesCmd(cmd);
      this.debugMessage(`Rule deleted: ${JSON.stringify(rule, null, 2)}`);
      return true;
    } catch (error) {
      console.error('Error deleting rule:', error);
      return false;
    }
  }

  private static execIptablesCmd(cmd: string): void {
    this.debugMessage(`Executing ${cmd}`);
    try {
      execSync(cmd, { stdio: 'ignore' });
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  private static debugMessage(m): void {
    const debug = true;

    if (debug) {
      console.log(m);
    }
  }
}
