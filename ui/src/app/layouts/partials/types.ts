export type NavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  description?: string;
  disabled?: boolean;

  // Optional nesting
  children?: NavItem[];

  // Optional grouping
  section?: string;
  hidden?: boolean;
  external?: boolean;
};
