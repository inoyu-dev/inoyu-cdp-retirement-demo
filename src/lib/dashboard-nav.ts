import type { LucideIcon } from "lucide-react";
import {
  FlaskConical,
  LayoutDashboard,
  Sparkles,
  TrendingDown,
  Users,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const DASHBOARD_NAV: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    description: "Live KPIs, traffic mix, and quick links",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/visitors",
    label: "Visitors",
    description: "Profiles, AI brief, behavior, and journey",
    icon: Users,
  },
  {
    href: "/dashboard/funnel",
    label: "Funnel",
    description: "Step drop-offs and AI friction analysis",
    icon: TrendingDown,
  },
  {
    href: "/dashboard/experiments",
    label: "Experiments",
    description: "Quiz variants and A/B performance",
    icon: FlaskConical,
  },
  {
    href: "/dashboard/tools",
    label: "AI & tools",
    description: "Token costs, agent chat, and SMS simulator",
    icon: Sparkles,
  },
];

export function isDashboardNavActive(pathname: string, item: DashboardNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
