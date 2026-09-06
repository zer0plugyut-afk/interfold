import {
  Activity01Icon,
  BrowserIcon,
  ChartBarLineIcon,
  Coins01Icon,
  GridViewIcon,
  Hexagon01Icon,
  HierarchySquare01Icon,
  JusticeScale01Icon,
  PieChart02Icon,
  ShieldEnergyIcon,
  Undo03Icon,
  VoteIcon,
} from "@hugeicons/core-free-icons";

export const NAV_ICONS = {
  operators: GridViewIcon,
  events: Activity01Icon,
  charts: ChartBarLineIcon,
  tokenomics: PieChart02Icon,
  dao: JusticeScale01Icon,
  apps: BrowserIcon,
};

export const CONTRACT_ICONS = {
  all: GridViewIcon,
  BondingRegistry: Coins01Icon,
  CiphernodeRegistry: HierarchySquare01Icon,
  Interfold: Hexagon01Icon,
  SlashingManager: ShieldEnergyIcon,
  E3RefundManager: Undo03Icon,
  CRISPProgram: VoteIcon,
  SelfRegistry: HierarchySquare01Icon,
  "CRISP-Interfold": Hexagon01Icon,
};

export const CONTRACT_FILTER_META = [
  { id: "all", label: "All", icon: GridViewIcon },
  { id: "BondingRegistry", label: "Bonding", icon: Coins01Icon },
  { id: "CiphernodeRegistry", label: "Registry", icon: HierarchySquare01Icon },
  { id: "Interfold", label: "Interfold (E3)", icon: Hexagon01Icon },
  { id: "SlashingManager", label: "Slashing", icon: ShieldEnergyIcon },
  { id: "E3RefundManager", label: "Refunds", icon: Undo03Icon },
];

export const CRISP_FILTER_META = [
  { id: "all", label: "All", icon: GridViewIcon },
  { id: "CRISPProgram", label: "CRISP", icon: VoteIcon },
  { id: "SelfRegistry", label: "Registry", icon: HierarchySquare01Icon },
  { id: "CRISP-Interfold", label: "Interfold", icon: Hexagon01Icon },
];
