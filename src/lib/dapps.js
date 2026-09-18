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
    /** Current CRISPProgram — registered tx 0x975b5104…8047 @ block 26004622 */
    programAddress: "0x53FCdb21E73A461CfE6c64B19855204384B91BA3",
    programDeployBlock: 25998868,
    programRegisteredBlock: 26004622,
    etherscan: "https://etherscan.io/address/0x53FCdb21E73A461CfE6c64B19855204384B91BA3",
  },
];

export function getDapp(id) {
  return DAPPS.find((d) => d.id === id) || null;
}
