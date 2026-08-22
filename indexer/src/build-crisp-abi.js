/**
 * Emit full JSON ABIs for mainnet CRISPProgram + SelfRegistry from the PR 1870
 * Solidity (contract is not verified on Etherscan).
 *
 *   node src/build-crisp-abi.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Interface } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const abisDir = path.join(__dirname, "../abis");

const CRISP_FRAGMENTS = [
  "constructor(address _initialOwner, address _risc0Verifier, address _honkVerifier, address _onchainHonkVerifier, bytes32 _imageId)",

  "event InterfoldBound(address indexed interfold)",
  "event InputPublished(uint256 indexed e3Id, address indexed slotAddress, bytes32 encryptedVoteCommitment, bytes encryptedVote, uint256 index, uint40 parentIndexPlusOne)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event EIP712DomainChanged()",

  "error CallerNotAuthorized()",
  "error E3AlreadyInitialized()",
  "error InterfoldAddressZero()",
  "error InterfoldAlreadyBound()",
  "error InterfoldNotContract()",
  "error ProgramNotRegistered()",
  "error Risc0VerifierAddressZero()",
  "error InvalidHonkVerifier()",
  "error EmptyInputData()",
  "error InvalidNoirProof()",
  "error InvalidMerkleRoot()",
  "error MerkleRootAlreadySet()",
  "error InvalidTallyLength()",
  "error CensusModeRequiresConstantCredits()",
  "error CensusModeRequiresToken()",
  "error InvalidCredits()",
  "error SlotNotEligible()",
  "error InvalidCensusMode()",
  "error UnsupportedTokenDecimals(uint8 decimals)",
  "error MinVotingPowerBelowScale()",
  "error UnknownParentInput(uint40 parentIndex)",
  "error InputAlreadyPublished(uint256 leaf)",
  "error SlotIsEmpty()",
  "error MerkleRootNotSet()",
  "error InvalidNumOptions()",
  "error InputDeadlinePassed(uint256 e3Id, uint256 deadline)",
  "error KeyNotPublished(uint256 e3Id)",
  "error E3NotAcceptingInputs(uint256 e3Id)",
  "error InvalidComputeContext()",
  "error OwnableUnauthorizedAccount(address account)",
  "error OwnableInvalidOwner(address owner)",

  "function ENCRYPTION_SCHEME_ID() view returns (bytes32)",
  "function TREE_DEPTH() view returns (uint8)",
  "function interfold() view returns (address)",
  "function risc0Verifier() view returns (address)",
  "function imageId() view returns (bytes32)",
  "function owner() view returns (address)",
  "function bindInterfold(address _interfold)",
  "function ballotDigest(uint256 e3Id, address slot, bytes32 ciphertextCommitment) view returns (bytes32)",
  "function setMerkleRoot(uint256 _e3Id, uint256 _root)",
  "function setImageId(bytes32 _imageId)",
  "function setRisc0Verifier(address _risc0Verifier)",
  "function getParamsHash(uint256 e3Id) view returns (bytes32)",
  "function getRoundData(uint256 e3Id) view returns (uint256 merkleRoot, bytes32 paramsHash, uint256 numOptions, uint8 creditMode, uint256 inputRoot, uint40 numberOfVotes)",
  "function votingPowerDivisorOf(uint256 e3Id) view returns (uint256)",
  "function votingPowerOf(uint256 e3Id, address slot) view returns (uint256)",
  "function censusModeOf(uint256 e3Id) view returns (uint8)",
  "function validate(uint256 e3Id, uint256 seed, bytes e3ProgramParams, bytes computeProviderParams, bytes customParams) returns (bytes32 encryptionSchemeId)",
  "function publishInput(uint256 e3Id, bytes data)",
  "function decodeTally(uint256 e3Id) view returns (uint256[] votes)",
  "function getSlotIndex(uint256 e3Id, address slotAddress) view returns (int40)",
  "function inputCommitmentOf(uint256 e3Id, address slotAddress, uint40 index) view returns (bytes32)",
  "function verify(uint256 e3Id, bytes32 ciphertextOutputHash, bytes32 ciphertextCommitment, bytes proof) view returns (bool success)",
  "function inputLeaf(bytes encryptedVote, bytes32 commitment, address slotAddress, uint40 parentIndexPlusOne) pure returns (uint256)",
  "function transferOwnership(address newOwner)",
  "function renounceOwnership()",
  "function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
];

const SELF_REGISTRY_FRAGMENTS = [
  "event Registered(address indexed account, uint256 index)",
  "error AlreadyRegistered(address account)",
  "function register()",
  "function isRegistered(address account) view returns (bool)",
  "function getPastVotes(address account, uint256) view returns (uint256)",
  "function totalRegistrants() view returns (uint256)",
  "function registrantAt(uint256 index) view returns (address)",
  "function registrants(uint256 start, uint256 count) view returns (address[] page)",
];

function writeAbi(file, fragments) {
  const iface = new Interface(fragments);
  const json = JSON.parse(iface.formatJson()).map((item) => {
    if (item.type === "constructor" && item.stateMutability === "undefined") {
      return { ...item, stateMutability: "nonpayable" };
    }
    return item;
  });
  const events = json.filter((x) => x.type === "event").map((x) => x.name);
  fs.writeFileSync(path.join(abisDir, file), JSON.stringify(json));
  console.log(
    file,
    json.length,
    "items;",
    "events:",
    events.join(", ") || "(none)"
  );
}

writeAbi("crisp-program.json", CRISP_FRAGMENTS);
writeAbi("self-registry.json", SELF_REGISTRY_FRAGMENTS);
