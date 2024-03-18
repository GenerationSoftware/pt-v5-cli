import { BigNumber, ethers, Contract } from "ethers";
import { Provider } from "@ethersproject/providers";
import { Command, Flags } from "@oclif/core";
import {
  downloadContractsBlob,
  getPrizePoolInfo,
  PrizeVault,
  PrizePoolInfo,
  getSubgraphPrizeVaults,
  populateSubgraphPrizeVaultAccounts,
} from "@generationsoftware/pt-v5-utils-js";
import * as core from "@actions/core";

import { createStatus, updateStatusFailure, updateStatusSuccess } from "../../lib/utils/status.js";
import { getProvider } from "../../lib/utils/getProvider.js";
import { createOutputPath } from "../../lib/utils/createOutputPath.js";
import { createExitCode } from "../../lib/utils/createExitCode.js";
import { writeToOutput } from "../../lib/utils/writeOutput.js";

/**
 * @name VaultAccounts
 */
// @ts-ignore
export default class VaultAccounts extends Command {
  static description =
    "Computes the previous draw's depositors with a non-zero balance for a PrizePool to a target output directory.";
  static examples = [
    `$ ptv5 compute vaultAccounts --chainId 1 --prizePool 0x0000000000000000000000000000000000000000 --outDir ./depositors
       Running compute:vaultAccounts on chainId: 1 for prizePool: 0x0 using latest drawID
  `,
  ];

  static flags = {
    chainId: Flags.string({
      char: "c",
      description: "ChainId (1 for Ethereum Mainnet, 80001 for Polygon Mumbai, etc...)",
      required: true,
    }),
    prizePool: Flags.string({
      char: "p",
      description: "PrizePool Address",
      required: true,
    }),
    outDir: Flags.string({
      char: "o",
      description: "Output Directory",
      required: true,
    }),
  };

  static args = [];
  static statusLoading = createStatus();

  // TODO: Fix this so it makes sense with new v5:
  public async catch(error: any): Promise<any> {
    console.log(error, "_error vaultAccounts");
    const { flags } = await this.parse(VaultAccounts);
    const { chainId, prizePool, outDir } = flags;

    const readProvider = getProvider(chainId);

    const prizePoolContract = await getPrizePoolByAddress(Number(chainId), prizePool, readProvider);

    const drawId = await prizePoolContract?.getLastAwardedDrawId();

    this.warn("Failed to fetch depositors (" + error + ")");
    const statusFailure = updateStatusFailure(VaultAccounts.statusLoading.createdAt, error);

    const outDirWithSchema = createOutputPath(outDir, chainId, prizePool.toLowerCase(), drawId);
    writeToOutput(outDirWithSchema, "status", statusFailure);
    createExitCode(error, this);

    core.setOutput("error", error);
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(VaultAccounts);
    const { chainId, prizePool, outDir } = flags;

    console.log("");
    console.log(
      `Running "calculate:vaultAccounts" on chainId: ${chainId} for prizePool: ${prizePool.toLowerCase()} using latest drawID`
    );

    const readProvider = getProvider(chainId);
    const prizePoolContract = await getPrizePoolByAddress(Number(chainId), prizePool, readProvider);
    const drawId = await prizePoolContract?.getLastAwardedDrawId();
    console.log(`DrawID: #${drawId.toString()}`);

    /* -------------------------------------------------- */
    // Create Status File
    /* -------------------------------------------------- */
    const outDirWithSchema = createOutputPath(outDir, chainId, prizePool, drawId);
    writeToOutput(outDirWithSchema, "status", VaultAccounts.statusLoading);

    /* -------------------------------------------------- */
    // Data Fetching && Compute
    /* -------------------------------------------------- */
    const contracts = await downloadContractsBlob(Number(chainId));
    const prizePoolInfo: PrizePoolInfo = await getPrizePoolInfo(readProvider, contracts);

    // #2. Collect all prizeVaults
    console.log();
    console.log(`Getting prize vaults from subgraph ...`);
    let prizeVaults = await getSubgraphPrizeVaults(Number(chainId));
    if (prizeVaults.length === 0) {
      throw new Error("Claimer: No prizeVaults found in subgraph");
    }

    // #3. Page through and concat all accounts for all prizeVaults
    console.log();
    console.log(
      `Getting depositors for each vault with a non-zero balance in the previous draw from subgraph ...`
    );
    prizeVaults = await populateSubgraphPrizeVaultAccounts(
      Number(chainId),
      prizeVaults,
      prizePoolInfo.lastDrawClosedAt
    );

    const numAccounts = prizeVaults.reduce(
      (accumulator, vault) => vault.accounts.length + accumulator,
      0
    );
    console.log();
    console.log(`${numAccounts} accounts deposited across ${prizeVaults.length} prizeVaults.`);
    console.log();
    console.log();
    /* -------------------------------------------------- */
    // Write to Disk
    /* -------------------------------------------------- */
    writeDepositorsToOutput(outDirWithSchema, chainId, prizePool, prizeVaults);

    console.log(`updateStatusSuccess`);
    const statusSuccess = updateStatusSuccess(VaultAccounts.statusLoading.createdAt, {
      numVaults: prizeVaults.length,
      numTiers: prizePoolInfo.numTiers,
      numPrizeIndices: prizePoolInfo.numPrizeIndices,
      numAccounts,
    });
    writeToOutput(outDirWithSchema, "status", statusSuccess);

    /* -------------------------------------------------- */
    // GitHub Actions Output
    /* -------------------------------------------------- */
    core.setOutput("runStatus", "true");
    core.setOutput("drawId", drawId.toString());
  }
}

const getPrizePoolByAddress = async (
  chainId: number,
  prizePool: string,
  readProvider: Provider
): Promise<Contract> => {
  const contracts = await downloadContractsBlob(Number(chainId));

  const prizePoolContractBlob = contracts.contracts.find(
    (contract: any) =>
      contract.chainId === Number(chainId) &&
      contract.type === "PrizePool" &&
      contract.address.toLowerCase() === prizePool.toLowerCase()
  );

  if (!prizePoolContractBlob) {
    throw new Error(
      `Multiple Contracts Unavailable: ${prizePool} on chainId: ${chainId} not found.`
    );
  }

  return new ethers.Contract(
    prizePoolContractBlob?.address,
    prizePoolContractBlob?.abi,
    readProvider
  );
};

const getTwabControllerByAddress = async (
  chainId: number,
  twabController: string,
  readProvider: Provider
): Promise<Contract> => {
  const contracts = await downloadContractsBlob(Number(chainId));

  const twabControllerContractBlob = contracts.contracts.find(
    (contract: any) =>
      contract.chainId === Number(chainId) &&
      contract.type === "TwabController" &&
      contract.address.toLowerCase() === twabController.toLowerCase()
  );

  if (!twabControllerContractBlob) {
    throw new Error(
      `Multiple Contracts Unavailable: ${twabController} on chainId: ${chainId} not found.`
    );
  }

  return new ethers.Contract(
    twabControllerContractBlob?.address,
    twabControllerContractBlob?.abi,
    readProvider
  );
};

export function mapBigNumbersToStrings(bigNumbers: Record<string, BigNumber>) {
  const obj: Record<string, string> = {};

  for (const entry of Object.entries(bigNumbers)) {
    const [key, value] = entry;
    obj[key] = BigNumber.from(value).toString();
  }

  return obj;
}

const getVaultPortions = async (
  chainId: number,
  prizePoolContract: Contract,
  prizePoolInfo: PrizePoolInfo
) => {
  const prizeVaultPortions: Record<string, BigNumber> = {};

  const startDrawId = prizePoolInfo.drawId;
  const endDrawId = startDrawId + 1;

  let prizeVaults = await getSubgraphPrizeVaults(chainId);
  if (prizeVaults.length === 0) {
    throw new Error("Claimer: No prizeVaults found in subgraph");
  }

  for (let prizeVault of prizeVaults) {
    prizeVaultPortions[prizeVault.id] = await prizePoolContract.getVaultPortion(
      prizeVault.id,
      startDrawId,
      endDrawId
    );
  }

  return prizeVaultPortions;
};

export function writeDepositorsToOutput(
  outDir: string,
  chainId: string,
  prizePoolAddress: string,
  prizeVaults: PrizeVault[]
): void {
  console.log("Writing depositors to output ...");

  for (const prizeVault of Object.values(prizeVaults)) {
    const userAddresses = prizeVault.accounts.map((account) => account.user.address);

    const vaultJson = {
      chainId,
      prizePoolAddress,
      vaultAddress: prizeVault.id,
      userAddresses,
    };

    writeToOutput(outDir, prizeVault.id.toLowerCase(), vaultJson);
  }
}