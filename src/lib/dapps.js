/**
 * Catalog of InterFold dapps. Add new apps here (+ migrations / indexer) as they ship.
 */
export const DAPPS = [
  {
    id: "crisp",
    name: "CRISP",
    tagline: "Encrypted ballots",
    network: "sepolia",
    networkLabel: "Sepolia",
    status: "live",
    /** Optional logo under /public — add crisp.png when you have it */
    icon: "/crisp.png",
    description:
      "Encrypted ballot program on InterFold. Live on Sepolia today; swap to mainnet when production CRISP ships.",
  },
];

export function getDapp(id) {
  return DAPPS.find((d) => d.id === id) || null;
}
