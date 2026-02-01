import * as React from "react";

import {
  LayoutDashboard,
  Shield,
  User,
  Settings,
  Globe,
  House,
  ArrowLeftToLine,
  ArrowRightFromLine,
  ArrowUpFromDot,
  ArrowDownToDot,
  X,
  Unplug,
  MessageSquareShare,
  Copy,
  CopyCheck,
  Box,
  Trash2,
  ShieldBan,
  BookText,
  Download,
  SquarePen,
  Eye,
  EyeOff,
  HardDriveUpload,
  Router,
  Heart,
  Info,
  Link2Off,
  LogOut,
  MoonStar,
  Ellipsis,
  Loader,
  Plus,
  Sun,
  Server,
  Boxes,
  Network,
  Activity,
  BarChart3,
  FileText,
  CreditCard,
  Key,
  Users,
  TrendingUp,
  TrendingDown,
  Laptop,
  Star,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  OctagonX,
  OctagonAlert,
} from "lucide-react";
import { IconRenderer, IconRendererProps } from "./icon";

const lucide =
  (Comp: React.ComponentType<any>): IconRenderer =>
  ({ size = 18, strokeWidth = 2, className, title }: IconRendererProps) => (
    <Comp size={size} strokeWidth={strokeWidth} className={className} aria-hidden={title ? undefined : true} />
  );

const svg =
  (Svg: React.ComponentType<React.SVGProps<SVGSVGElement>>): IconRenderer =>
  ({ size = 18, className, title }: IconRendererProps) => (
    <Svg width={size} height={size} className={className} role={title ? "img" : "presentation"} aria-hidden={title ? undefined : true} />
  );

const WiredoorLight: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" {...props}>
    <g id="mark">
      <polygon fill="#152168" points="3.703,43.836 0.003,40.142 0.000,9.876 18.829,28.705" />
      <polygon fill="#152168" points="96.297,43.836 81.163,28.702 100.000,9.876 99.997,40.142" />
      <polygon fill="#152168" points="36.507,46.383 50.003,9.867 63.502,46.374" />
      <polygon fill="#06B6D4" points="36.507,46.383 36.507,23.369 36.504,23.366 36.507,23.363 50.003,9.867" />
      <polygon fill="#0EA5E9" points="63.502,46.374 50.003,9.867 63.502,23.366" />
      <polygon fill="#1D4ED8" points="9.872,50.004 24.994,34.870 36.507,46.383" />
      <polygon fill="#1E40AF" points="90.128,50.004 63.502,46.374 74.994,34.870" />
      <polygon fill="#2563EB" points="36.507,76.640 9.872,50.004 36.507,46.383 50.000,90.133" />
      <polygon fill="#2563EB" points="50.000,90.133 63.502,46.374 90.128,50.004 63.502,76.631" />
      <polygon fill="#1E3A8A" points="50.000,90.133 36.507,46.383 63.502,46.374" />
    </g>
  </svg>
);

const WiredoorDark: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" {...props}>
    <g id="mark">
      <polygon fill="#1D4ED8" points="3.703,43.836 0.003,40.142 0.000,9.876 18.829,28.705" />
      <polygon fill="#1D4ED8" points="96.297,43.836 81.163,28.702 100.000,9.876 99.997,40.142" />
      <polygon fill="#1D4ED8" points="36.507,46.383 50.003,9.867 63.502,46.374" />
      <polygon fill="#67E8F9" points="36.507,46.383 36.507,23.369 36.504,23.366 36.507,23.363 50.003,9.867" />
      <polygon fill="#22D3EE" points="63.502,46.374 50.003,9.867 63.502,23.366" />
      <polygon fill="#0EA5E9" points="9.872,50.004 24.994,34.870 36.507,46.383" />
      <polygon fill="#2563EB" points="90.128,50.004 63.502,46.374 74.994,34.870" />
      <polygon fill="#38BDF8" points="36.507,76.640 9.872,50.004 36.507,46.383 50.000,90.133" />
      <polygon fill="#38BDF8" points="50.000,90.133 63.502,46.374 90.128,50.004 63.502,76.631" />
      <polygon fill="#1D4ED8" points="50.000,90.133 36.507,46.383 63.502,46.374" />
    </g>
  </svg>
);

const Github: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" {...props}>
    <path
      fill="currentColor"
      d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"
    ></path>
  </svg>
);

export const icons = {
  // Lucide
  activity: lucide(Activity),
  arrowUp: lucide(ArrowUpFromDot),
  arrowDown: lucide(ArrowDownToDot),
  back: lucide(ArrowLeftToLine),
  boxes: lucide(Boxes),
  chart: lucide(BarChart3),
  "chevron-down": lucide(ChevronDown),
  "chevron-up": lucide(ChevronUp),
  "chevron-right": lucide(ChevronRight),
  "chevron-left": lucide(ChevronLeft),
  close: lucide(X),
  connect: lucide(Unplug),
  contact: lucide(MessageSquareShare),
  copy: lucide(Copy),
  copyCheck: lucide(CopyCheck),
  creditCard: lucide(CreditCard),
  cube: lucide(Box),
  danger: lucide(OctagonX),
  dashboard: lucide(LayoutDashboard),
  delete: lucide(Trash2),
  disconnect: lucide(ShieldBan),
  docs: lucide(BookText),
  download: lucide(Download),
  edit: lucide(SquarePen),
  eye: lucide(Eye),
  "eye-off": lucide(EyeOff),
  expose: lucide(HardDriveUpload),
  external: lucide(ExternalLink),
  forward: lucide(ArrowRightFromLine),
  gateway: lucide(Router),
  globe: lucide(Globe),
  heart: lucide(Heart),
  home: lucide(House),
  key: lucide(Key),
  info: lucide(Info),
  laptop: lucide(Laptop),
  "link-off": lucide(Link2Off),
  logout: lucide(LogOut),
  logs: lucide(FileText),
  moon: lucide(MoonStar),
  more: lucide(Ellipsis),
  network: lucide(Network),
  plus: lucide(Plus),
  server: lucide(Server),
  settings: lucide(Settings),
  shield: lucide(Shield),
  spin: lucide(Loader),
  star: lucide(Star),
  sun: lucide(Sun),
  trendingUp: lucide(TrendingUp),
  trendingDown: lucide(TrendingDown),
  user: lucide(User),
  users: lucide(Users),
  warning: lucide(OctagonAlert),

  // Custom SVG
  github: svg(Github),
  "wiredoor-light": svg(WiredoorLight),
  "wiredoor-dark": svg(WiredoorDark),
} as const;
