import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu as Root,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem as ItemBase,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';

export type DropdownVariant = 'default' | 'destructive';

export type DropdownNode =
  | {
      type: 'label';
      label: React.ReactNode;
      className?: string;
    }
  | {
      type: 'separator';
      className?: string;
    }
  | {
      type: 'item';
      label: React.ReactNode;
      variant?: DropdownVariant;
      disabled?: boolean;
      inset?: boolean;
      shortcut?: string;
      keepOpen?: boolean;
      className?: string;
      onAction?: () => void;
    }
  | {
      type: 'group';
      label?: React.ReactNode;
      className?: string;
      children: DropdownNode[];
    }
  | {
      type: 'sub';
      label: React.ReactNode;
      className?: string;
      children: DropdownNode[];
    };

export type DropdownSlots = {
  content?: string;
  label?: string;
  separator?: string;
  group?: string;
  item?: string;
  subTrigger?: string;
  subContent?: string;
};

export type DropdownProps = {
  trigger?: string | React.ReactNode;
  items: DropdownNode[];
  classNames?: DropdownSlots;
  contentProps?: React.ComponentProps<typeof DropdownMenuContent>;
  triggerVariant?: React.ComponentProps<typeof Button>['variant'];
  triggerSize?: React.ComponentProps<typeof Button>['size'];
  align?: React.ComponentProps<typeof DropdownMenuContent>['align'];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function getVariantClass(variant?: DropdownVariant) {
  if (variant === 'destructive') {
    return 'text-destructive hover:text-destructive data-[highlighted]:text-destructive data-[highlighted]:bg-destructive/10';
  }
  return '';
}

export function Dropdown({
  open,
  onOpenChange,
  trigger = 'Open',
  items,
  classNames,
  contentProps,
  align = 'start',
  triggerVariant = 'outline',
  triggerSize = 'default',
}: DropdownProps) {
  const triggerNode =
    typeof trigger === 'string' ? (
      <Button variant={triggerVariant} size={triggerSize}>
        {trigger}
      </Button>
    ) : (
      trigger
    );

  return (
    <Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{triggerNode}</DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align={align} sideOffset={8} {...contentProps} className={cn('min-w-56', classNames?.content, contentProps?.className)}>
          {renderNodes(items, classNames)}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Root>
  );
}

function renderNodes(nodes: DropdownNode[], slots?: DropdownSlots): React.ReactNode {
  return nodes.map((n, i) => renderNode(n, i, slots));
}

function renderNode(node: DropdownNode, key: React.Key, slots?: DropdownSlots): React.ReactNode {
  switch (node.type) {
    case 'label':
      return (
        <DropdownMenuLabel key={key} className={cn(slots?.label, node.className)}>
          {node.label}
        </DropdownMenuLabel>
      );

    case 'separator':
      return <DropdownMenuSeparator key={key} className={cn(slots?.separator, node.className)} />;

    case 'item': {
      const vcls = getVariantClass(node.variant);
      const inset: string = node.inset ? 'pl-8' : '';
      return (
        <ItemBase
          key={key}
          disabled={node.disabled}
          className={cn(vcls, inset, slots?.item, node.className)}
          onSelect={(e) => {
            if (node.keepOpen) e.preventDefault();
            node.onAction?.();
          }}
        >
          {node.label}
          {node.shortcut && <DropdownMenuShortcut>{node.shortcut}</DropdownMenuShortcut>}
        </ItemBase>
      );
    }

    case 'group': {
      const content = (
        <>
          {node.label && <DropdownMenuLabel className={cn('pt-1', slots?.label)}>{node.label}</DropdownMenuLabel>}
          {renderNodes(node.children, slots)}
        </>
      );
      return (
        <DropdownMenuGroup key={key} className={cn('grid gap-0.5', slots?.group, node.className)}>
          {content}
        </DropdownMenuGroup>
      );
    }

    case 'sub':
      return (
        <DropdownMenuSub key={key}>
          <DropdownMenuSubTrigger className={cn(slots?.subTrigger, node.className)}>{node.label}</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className={cn(slots?.subContent)}>{renderNodes(node.children, slots)}</DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      );

    default:
      return null;
  }
}
