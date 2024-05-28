import * as core from "@actions/core";
import { BigNumber, ethers, Contract } from "ethers";
import { Provider } from "@ethersproject/providers";
import { Command, Flags } from "@oclif/core";
import { readFileSync } from "fs";
import {
  PrizePoolInfo,
  PrizeVault,
  downloadContractsBlob,
  getPrizePoolInfo,
} from "@generationsoftware/pt-v5-utils-js";

import { createStatus, updateStatusFailure, updateStatusSuccess } from "../../lib/utils/status.js";
import { getProvider } from "../../lib/utils/getProvider.js";
import { createOutputPath } from "../../lib/utils/createOutputPath.js";
import { createExitCode } from "../../lib/utils/createExitCode.js";
import { getAllPrizeVaultsAndAccountsWithBalance } from "../../lib/utils/getAllPrizeVaultsAndAccountsWithBalance.js";
import { writeToOutput } from "../../lib/utils/writeOutput.js";
import { Winner } from "../../types.js";

/**
 * @name ConcatWinners
 */
// @ts-ignore
export default class ConcatWinners extends Command {
  static description =
    "Ingests foundry-winner-calc output files and ties them into one winners.json file.";
  static examples = [
    `$ ptv5 utils concatWinners --chainId 1 --prizePool 0x0000000000000000000000000000000000000000 --outDir ./vaultAccounts --contractJsonUrl 'https://raw.githubusercontent.com/GenerationSoftware/pt-v5-testnet/.../contracts.json' --subgraphUrl 'https://api.studio.thegraph.com/query/...'
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
    contractJsonUrl: Flags.string({
      char: "j",
      description: "JSON URL of Contracts",
      required: true,
    }),
    subgraphUrl: Flags.string({
      char: "s",
      description: "URL of the Subgraph API",
      required: true,
    }),
  };

  static args = [];
  static statusLoading = createStatus();

  public async catch(error: any): Promise<any> {
    console.log(error, "_error vaultAccounts");
    const { flags } = await this.parse(ConcatWinners);
    const { chainId, prizePool, outDir, contractJsonUrl, subgraphUrl } = flags;

    const readProvider = getProvider();

    const prizePoolContract = await getPrizePoolByAddress(
      Number(chainId),
      contractJsonUrl,
      prizePool,
      readProvider
    );

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
    const { chainId, prizePool, outDir, contractJsonUrl, subgraphUrl } = flags;

    console.log("");
    console.log(`Running "utils:concatWinners"`);
    console.log("");

    const readProvider = getProvider();
    const contracts = await downloadContractsBlob(contractJsonUrl);
    const prizePoolContract = await getPrizePoolByAddress(
      Number(chainId),
      contractJsonUrl,
      prizePool,
      readProvider
    );
    const prizePoolInfo: PrizePoolInfo = await getPrizePoolInfo(readProvider, contracts);
    const drawId = await prizePoolContract?.getLastAwardedDrawId();

    console.log(`chainId:          ${chainId}`);
    console.log(`prizePool:        ${prizePool.toLowerCase()}`);
    console.log(`drawId:           #${drawId.toString()}`);
    console.log(`contractJsonUrl:  ${contractJsonUrl}`);
    console.log(`subgraphUrl:      ${subgraphUrl}`);
    console.log(`outDir:           ${outDir}`);

    /* -------------------------------------------------- */
    // Create Status File
    /* -------------------------------------------------- */
    const outDirWithSchema = createOutputPath(outDir, chainId, prizePool, drawId);
    writeToOutput(outDirWithSchema, "status", ConcatWinners.statusLoading);

    const { prizeVaults, numAccounts } = await getAllPrizeVaultsAndAccountsWithBalance(
      subgraphUrl,
      prizePoolInfo
    );
    console.log();
    console.log(`${numAccounts} accounts deposited across ${prizeVaults.length} prizeVaults.`);
    console.log();
    console.log();

    /* -------------------------------------------------- */
    // Write to Disk
    /* -------------------------------------------------- */
    writeCombinedWinnersToOutput(outDirWithSchema, prizeVaults);

    const statusSuccess = updateStatusSuccess(ConcatWinners.statusLoading.createdAt, {
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
  contractJsonUrl: string,
  prizePool: string,
  readProvider: Provider
): Promise<Contract> => {
  const contracts = await downloadContractsBlob(contractJsonUrl);

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

export function writeCombinedWinnersToOutput(outDirWithSchema: string, vaults: PrizeVault[]): void {
  console.log("Writing combined winners to output ...");

  let winnersJson: Record<string, Winner[]> = {};
  for (const vault of Object.values(vaults)) {
    const fileJson = readFileSync(`${outDirWithSchema}${vault.id.toLowerCase()}.json`, "utf8");

    winnersJson[vault.id.toLowerCase()] = JSON.parse(fileJson).winners;
  }

  writeToOutput(outDirWithSchema, "winners", winnersJson);
}
