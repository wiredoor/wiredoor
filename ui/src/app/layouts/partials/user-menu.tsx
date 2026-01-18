import * as React from "react";
import { Link } from "react-router-dom";
import { CreditCard, LogOut, Settings, User, Users, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Inline } from "@/components/foundations";

export type UserMenuUser = {
  name: string;
  email?: string;
  avatarUrl?: string;
};

export type UserMenuProps = {
  user: UserMenuUser;

  profileHref?: string;
  settingsHref?: string;
  teamHref?: string;
  billingHref?: string;

  onLogout?: () => void;

  /** Optional "Upgrade" CTA in menu */
  showUpgrade?: boolean;
  upgradeHref?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

export function UserMenu({
  user,
  profileHref = "/account",
  settingsHref = "/settings",
  teamHref = "/team",
  billingHref = "/billing",
  onLogout,
  showUpgrade = false,
  upgradeHref = "/billing?upgrade=1",
}: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 px-2 gap-2" aria-label="User menu">
          <Inline>
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/80 text-primary-foreground">{initials(user.name) || "U"}</AvatarFallback>
            </Avatar>

            <span className="hidden md:inline-flex max-w-35 truncate text-sm font-medium">{user.name}</span>
          </Inline>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="p-0">
          <div className="px-2 py-2">
            <div className="text-sm font-medium truncate">{user.name}</div>
            {user.email ? <div className="text-xs text-muted-foreground truncate">{user.email}</div> : null}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {showUpgrade ? (
          <>
            <DropdownMenuItem asChild>
              <Link to={upgradeHref} className="flex items-center">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade plan
                <span className="ml-auto text-xs text-muted-foreground">Pro</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuItem asChild>
          <Link to={profileHref} className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to={settingsHref} className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to={teamHref} className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Team
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to={billingHref} className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(e) => {
            if (!onLogout) return;
            e.preventDefault();
            onLogout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
