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
  /** Aragon VE — locked FOLD (not ciphernode bond). Deploy ≈ 25779726. */
  escrow: {
    key: "escrow",
    label: "VotingEscrow",
    address: "0x71360F335e4Ec9c010e29bA7171bc62c9B4c1F12",
    deployBlock: 25779726,
    abiFile: "escrow.json",
    /** Free RPC: keep getLogs ranges small for first backfill. */
    logChunk: 1_500,
  },
  escrowIvotes: {
    key: "escrowIvotes",
    label: "EscrowIVotesAdapter",
    address: "0x8f141B4D294d39e7D1530916A3eD65B3970C6FEc",
    deployBlock: 25779726,
    abiFile: "escrow-ivotes.json",
    logChunk: 1_500,
  },
  exitQueue: {
    key: "exitQueue",
    label: "ExitQueue",
    address: "0x8095C0B90Be4abCBF5CA7371f588fe1637E02b7f",
    deployBlock: 25779726,
    abiFile: "exit-queue.json",
    logChunk: 1_500,
  },
  /** veFOLD receipt NFT — Transfer logs detect beginWithdrawal (NFT → escrow). */
  veFoldNft: {
    key: "veFoldNft",
    label: "veFOLD",
    address: "0xF3eeE0f5E721b8c0073C8d85bf26A3d6EC293A0E",
    deployBlock: 25779726,
    abiFile: "ve-fold-nft.json",
    logChunk: 1_500,
  },
  /**
   * FOLD token lock-schedule events only (no Transfer spam).
   * Vesting / airdrop / claim locks → BondedVotes vesting weight.
   * First ActiveLockUpdated ≈ 25502775.
   */
  foldLocks: {
    key: "foldLocks",
    label: "FOLDLocks",
    address: "0xE172e9B6cfBeeB5593bDcE3f077356FDb33af904",
    deployBlock: 25502775,
    abiFile: "fold-locks.json",
    logChunk: 2_000,
  },
};

/** Official IVotes adapter used by Aragon TokenVoting / CRISP (locked + bonded + vesting). */
export const BONDED_VOTES = "0x028deEA644258c78b1B5B2eacF469F5D781Fb43E";

export const TOKENS = {
  fold: "0xE172e9B6cfBeeB5593bDcE3f077356FDb33af904",
  tfold: "0xC0B5b49a3949eC4B520eF21BaCFE16e3695F3B5D",
  /** veFOLD receipt NFT (VotingEscrow lock positions). */
  veFoldNft: "0xF3eeE0f5E721b8c0073C8d85bf26A3d6EC293A0E",
  bondedVotes: BONDED_VOTES,
};
