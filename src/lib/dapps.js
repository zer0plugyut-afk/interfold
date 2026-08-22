/**
 * Catalog of InterFold dapps. Add new apps here (+ migrations / indexer) as they ship.
 */
export const DAPPS = [
  {
    id: "crisp",
    name: "CRISP",
    tagline: "Encrypted ballots",
    network: "mainnet",
    networkLabel: "Mainnet",
    status: "live",
    /** Optional logo under /public — add crisp.png when you have it */
    icon: "/crisp.png",
    description:
      "Encrypted ballot program on InterFold. Live on Ethereum mainnet (CRISPProgram + SelfRegistry).",
  },
];

export function getDapp(id) {
  return DAPPS.find((d) => d.id === id) || null;
}
