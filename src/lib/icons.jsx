import {
  Coins,
  Network,
  Hexagon,
  ShieldAlert,
  LayoutGrid,
  Activity,
  BarChart3,
  Vote,
  PieChart,
  AppWindow,
  Undo2,
} from "lucide-react";

export const NAV_ICONS = {
  operators: LayoutGrid,
  events: Activity,
  charts: BarChart3,
  tokenomics: PieChart,
  apps: AppWindow,
};

export const CONTRACT_ICONS = {
  all: LayoutGrid,
  BondingRegistry: Coins,
  CiphernodeRegistry: Network,
  Interfold: Hexagon,
  SlashingManager: ShieldAlert,
  E3RefundManager: Undo2,
  CRISPProgram: Vote,
  SelfRegistry: Network,
  "CRISP-Interfold": Hexagon,
};

export const CONTRACT_FILTER_META = [
  { id: "all", label: "All", Icon: LayoutGrid },
  { id: "BondingRegistry", label: "Bonding", Icon: Coins },
  { id: "CiphernodeRegistry", label: "Registry", Icon: Network },
  { id: "Interfold", label: "Interfold (E3)", Icon: Hexagon },
  { id: "SlashingManager", label: "Slashing", Icon: ShieldAlert },
  { id: "E3RefundManager", label: "Refunds", Icon: Undo2 },
];

export const CRISP_FILTER_META = [
  { id: "all", label: "All", Icon: LayoutGrid },
  { id: "CRISPProgram", label: "CRISP", Icon: Vote },
  { id: "SelfRegistry", label: "Registry", Icon: Network },
  { id: "CRISP-Interfold", label: "Interfold", Icon: Hexagon },
];
