// SVG icons of the sidebar and pages (from mtg_ledger_core's former templates).

import type { ReactNode } from "react";

export const Logo = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
    <rect x="5" y="3" width="22" height="28" rx="3" fill="none" stroke="#D4B062" strokeWidth="2" />
    <path d="M10 10h12M10 15h12M10 20h8" stroke="#D4B062" strokeWidth="2" strokeLinecap="round" />
    <circle cx="25" cy="25" r="5" fill="#121318" stroke="#D4B062" strokeWidth="2" />
  </svg>
);

const Icon = ({ children, size = 18, stroke = "currentColor" }: { children: ReactNode; size?: number; stroke?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden="true">
    {children}
  </svg>
);

export const SyncIcon = () => (
  <Icon>
    <path d="M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8" />
    <path d="M18 2v4h-4M6 22v-4h4" />
  </Icon>
);

export const NavCollection = () => (
  <Icon>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="9" rx="1" />
    <rect x="3" y="15" width="7" height="6" rx="1" />
    <rect x="14" y="15" width="7" height="6" rx="1" />
  </Icon>
);

export const NavSale = () => (
  <Icon>
    <path d="M20 12l-8 8-9-9V3h8z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </Icon>
);

export const NavCards = () => (
  <Icon>
    <rect x="7" y="3" width="12" height="16" rx="1.5" />
    <path d="M4 7v12.5A1.5 1.5 0 0 0 5.5 21H15" />
  </Icon>
);

export const PackageIcon = ({ size = 18, stroke = "currentColor" }: { size?: number; stroke?: string }) => (
  <Icon size={size} stroke={stroke}>
    <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
    <path d="M3 7l9 4 9-4M12 11v10" />
  </Icon>
);

export const LogoutIcon = () => (
  <Icon>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </Icon>
);

export const SearchIcon = () => (
  <Icon size={16} stroke="#A7A39A">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-5-5" />
  </Icon>
);
