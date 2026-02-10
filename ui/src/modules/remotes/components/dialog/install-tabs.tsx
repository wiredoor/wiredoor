import { useState } from 'react';
import { Terminal, TerminalCommand } from '@/components/compound/terminal';
import { Icon, IconName } from '@/components/foundations';

export type InstallationTabsProps = {
  token: string;
  serverUrl?: string;
} & React.HTMLAttributes<HTMLDivElement>;

type Platform = 'linux' | 'macos' | 'windows' | 'docker' | 'kubernetes';

interface Tab {
  id: Platform;
  label: string;
  icon: IconName;
}

const tabs: Tab[] = [
  { id: 'linux', label: 'Linux', icon: 'linux' },
  { id: 'macos', label: 'macOS', icon: 'macos' },
  { id: 'windows', label: 'Windows', icon: 'windows' },
  { id: 'docker', label: 'Docker', icon: 'docker' },
  { id: 'kubernetes', label: 'Kubernetes', icon: 'kubernetes' },
];

export function InstallationTabs({ token, serverUrl = 'https://api.wiredoor.net', className }: InstallationTabsProps) {
  const [activeTab, setActiveTab] = useState<Platform>('linux');

  const getInstallCode = (platform: Platform): TerminalCommand[] => {
    switch (platform) {
      case 'linux':
        return [
          { command: '# Works on Arch, Debian/Ubuntu/Raspbian, Fedora/RedHat, Alpine' },
          { command: 'curl -fsSL https://www.wiredoor.net/install.sh | sh', copy: true },
          { command: `wiredoor connect --url=${serverUrl} --token=${token}`, copy: true },
        ];

      case 'macos':
        return [
          { command: '# Install via Homebrew' },
          { command: 'brew install wiredoor/tap/wiredoor', copy: true },
          { command: `wiredoor connect --url=${serverUrl} --token=${token}`, copy: true },
        ];

      case 'windows':
        return [
          { command: '# Run as Administrator' },
          { command: 'irm https://www.wiredoor.net/install.ps1 | iex', copy: true },
          { command: `wiredoor connect --url=${serverUrl} --token=${token}`, copy: true },
        ];

      case 'docker':
        return [
          { command: '# Run as a container' },
          {
            command: 'docker run -d --name wiredoor-gw --restart unless-stopped',
            flags: [`-e WIREDOOR_URL=${serverUrl}`, `-e WIREDOOR_TOKEN=${token}`, 'wiredoor/wiredoor-cli:latest'],
            copy: true,
          },
        ];
      case 'kubernetes':
        return [
          { command: '# Install via Helm' },
          { command: 'helm repo add wiredoor https://charts.wiredoor.net', copy: true },
          { command: 'helm repo update', copy: true },
          {
            command: `helm install my-wiredoor-node wiredoor/wiredoor-node`,
            flags: [`--set wiredoor.server=${serverUrl}`, `--set wiredoor.token=${token}`],
            copy: true,
          },
        ];

      default:
        return [];
    }
  };

  const getPlatformNote = (platform: Platform): string | null => {
    switch (platform) {
      case 'linux':
        return 'The installation script automatically detects your Linux distribution and installs the appropriate package.';
      case 'windows':
        return 'Administrator privileges are required to install Wiredoor CLI on Windows.';
      case 'docker':
        return 'Recommended for headless servers and containerized environments.';
      case 'kubernetes':
        return 'Deploy Wiredoor as a pod in your Kubernetes cluster for cloud-native integration.';
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className='text-sm font-medium text-foreground mb-3'>Installation & Connection</h3>
        <p className='text-xs text-muted-foreground'>Choose your platform and follow the instructions to install and connect</p>
      </div>

      {/* Tabs */}
      <div className='flex gap-2 border-b border-border pb-2 overflow-x-auto'>
        {tabs.map((tab) => {
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-muted/50 text-primary border-b-2 border-primary -mb-[2px]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Icon name={tab.icon} className='w-4 h-4' />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className='space-y-4 w-full'>
        {getPlatformNote(activeTab) && (
          <div className='px-3 py-2 bg-blue-50 border border-blue-200 rounded-md'>
            <p className='text-xs text-blue-900'>{getPlatformNote(activeTab)}</p>
          </div>
        )}
        <div className='flex justify-center w-full'>
          <div className='max-w-2xl'>
            <Terminal title='Installation & Connection' entries={getInstallCode(activeTab)} />
          </div>
        </div>
      </div>
    </div>
  );
}
