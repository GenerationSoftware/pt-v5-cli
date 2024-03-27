import { BigNumber, ethers, Contract } from "ethers";
import { Provider } from "@ethersproject/providers";
import { Command, Flags } from "@oclif/core";
import * as core from "@actions/core";
import { downloadContractsBlob, getSubgraphPrizeVaults } from "@generationsoftware/pt-v5-utils-js";

import { createStatus, updateStatusFailure, updateStatusSuccess } from "../../lib/utils/status.js";
import { getProvider } from "../../lib/utils/getProvider.js";
import { createOutputPath } from "../../lib/utils/createOutputPath.js";
import { createExitCode } from "../../lib/utils/createExitCode.js";
import { writeToOutput, writeCombinedWinnersToOutput } from "../../lib/utils/writeOutput.js";

/**
 * @name ConcatWinners
 */
// @ts-ignore
export default class ConcatWinners extends Command {
  static description =
    "Takes all of foundry-winners-calc output files and ties them into one winners.json file.";
  static examples = [
    `$ ptv5 utils concatWinners --chainId 1 --prizePool 0x0000000000000000000000000000000000000000 --outDir ./vaultAccounts
       Running utils:concatWinners on chainId: 1 for prizePool: 0x0 using latest drawID
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

  public async catch(error: any): Promise<any> {
    console.log(error, "_error vaultAccounts");
    const { flags } = await this.parse(ConcatWinners);
    const { chainId, prizePool, outDir } = flags;

    const readProvider = getProvider(chainId);

    const prizePoolContract = await getPrizePoolByAddress(Number(chainId), prizePool, readProvider);

    const drawId = await prizePoolContract?.getLastAwardedDrawId();

    this.warn("Failed to concat winner output files (" + error + ")");
    const statusFailure = updateStatusFailure(ConcatWinners.statusLoading.createdAt, error);

    const outDirWithSchema = createOutputPath(outDir, chainId, prizePool.toLowerCase(), drawId);
    writeToOutput(outDirWithSchema, "status", statusFailure);
    createExitCode(error, this);

    core.setOutput("error", error);
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(ConcatWinners);
    const { chainId, prizePool, outDir } = flags;

    console.log("");
    console.log(
      `Running "utils:concatWinners" on chainId: ${chainId} for prizePool: ${prizePool.toLowerCase()} using latest drawID`
    );

    const readProvider = getProvider(chainId);
    const prizePoolContract = await getPrizePoolByAddress(Number(chainId), prizePool, readProvider);
    const drawId = await prizePoolContract?.getLastAwardedDrawId();
    console.log(`DrawID: #${drawId.toString()}`);

    /* -------------------------------------------------- */
    // Create Status File
    /* -------------------------------------------------- */
    const outDirWithSchema = createOutputPath(outDir, chainId, prizePool, drawId);
    writeToOutput(outDirWithSchema, "concatWinnersStatus", ConcatWinners.statusLoading);

    // #2. Collect all vaults
    console.log();
    console.log(`Getting prize vaults from subgraph ...`);
    let vaults = await getSubgraphPrizeVaults(Number(chainId));
    if (vaults.length === 0) {
      throw new Error("Claimer: No vaults found in subgraph");
    }

    /* -------------------------------------------------- */
    // Write to Disk
    /* -------------------------------------------------- */
    writeCombinedWinnersToOutput(outDirWithSchema, vaults);

    console.log(`updateStatusSuccess`);
    const statusSuccess = updateStatusSuccess(ConcatWinners.statusLoading.createdAt, {});
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

export function mapBigNumbersToStrings(bigNumbers: Record<string, BigNumber>) {
  const obj: Record<string, string> = {};

  for (const entry of Object.entries(bigNumbers)) {
    const [key, value] = entry;
    obj[key] = BigNumber.from(value).toString();
  }

  return obj;
}
