export const CHAIN_ID = 1;

export const CONTRACTS = {
  bonding: {
    key: "bonding",
    label: "BondingRegistry",
    address: "0x0ec90465095C21830BEcED07e032809A2Bd2915F",
    deployBlock: 25473398,
    abiFile: "bonding.json",
  },
  registry: {
    key: "registry",
    label: "CiphernodeRegistry",
    address: "0xC927A5B2d8F68697bC28C0670df05178c93df2d7",
    deployBlock: 25786378,
    abiFile: "registry.json",
  },
  interfold: {
    key: "interfold",
    label: "Interfold",
    address: "0x28cF63B459e6218C69EA97ea7D90541cf648c715",
    deployBlock: 25786382,
    abiFile: "interfold.json",
  },
  slash: {
    key: "slash",
    label: "SlashingManager",
    address: "0x974E865B1BB24AF2a9ef8204AdEA9251Cc7C5FD9",
    deployBlock: 25786375,
    abiFile: "slash.json",
  },
  refund: {
    key: "refund",
    label: "E3RefundManager",
    address: "0x1940eF168f4E0B3dA24BEca539856684793B0F6e",
    deployBlock: 25786384,
    abiFile: "refund.json",
    /** Nothing on-chain yet — watch from tip, don't scan empty history. */
    startAtTip: true,
  },
};

export const TOKENS = {
  fold: "0xE172e9B6cfBeeB5593bDcE3f077356FDb33af904",
  tfold: "0xC0B5b49a3949eC4B520eF21BaCFE16e3695F3B5D",
};
