import { Outlet } from 'react-router-dom';

import { Icon } from '@/components/foundations/icon';
import { AppLayout } from '@/layouts/base/AppLayout';
import { Footer } from './partials/footer';
import { Logo } from './partials/logo';
import { AppSidebar } from './partials/app-sidebar';
import { TopNav } from './partials/top-nav';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from './partials/theme-toggle';
import { NavItem } from './partials/types';
import { HelpMenu } from './partials/help-menu';
import { UserMenu } from './partials/user-menu';
import { SidebarFooterCTA } from './partials/sidebar-footer-cta';

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', href: '/', icon: <Icon name='home' className='h-4 w-4' /> },
  {
    id: 'services',
    label: 'Services',
    href: '/services',
    icon: <Icon name='gateway' className='h-4 w-4' />,
    children: [
      { id: 'http', label: 'HTTP Services', href: '/services/http' },
      { id: 'tcp', label: 'Network Services', href: '/services/tcp' },
    ],
  },
  { id: 'remotes', label: 'Remote Nodes', href: '/nodes', icon: <Icon name='globe' className='h-4 w-4' /> },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: <Icon name='settings' className='h-4 w-4' />,
  },
];

export function AppRootLayout() {
  const onLogout = () => {
    console.log('Logout clicked');
  };

  return (
    <AppLayout
      headerSlot={
        <TopNav
          leftSlot={<SidebarTrigger />}
          rightSlot={
            <div className='flex items-center gap-1'>
              <ThemeToggle />
              <HelpMenu />
              <UserMenu onLogout={onLogout} showUpgrade />
            </div>
          }
        />
      }
      sidebarSlot={<AppSidebar brand={<Logo sidebar={true} />} navItems={navItems} sidebarFooterSlot={<SidebarFooterCTA />} />}
      footerSlot={<Footer />}
      constrainContent={false}
    >
      <Outlet />
    </AppLayout>
  );
}
