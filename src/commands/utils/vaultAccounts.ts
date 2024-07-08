import { readFileSync } from "fs";
import { Command, Flags } from "@oclif/core";
import {
  downloadContractsBlob,
  getPrizePoolInfo,
  PrizeVault,
  PrizePoolInfo,
} from "@generationsoftware/pt-v5-utils-js";
import * as core from "@actions/core";
import { computeWinners } from "@generationsoftware/tevm-winner-calc";

import { createStatus, updateStatusFailure, updateStatusSuccess } from "../../lib/utils/status.js";
import { getProvider } from "../../lib/utils/getProvider.js";
import { createOutputPath } from "../../lib/utils/createOutputPath.js";
import { createExitCode } from "../../lib/utils/createExitCode.js";
import { getAllPrizeVaultsAndAccountsWithBalance } from "../../lib/utils/getAllPrizeVaultsAndAccountsWithBalance.js";
import { getPrizePoolByAddress } from "../../lib/utils/getPrizePoolByAddress.js";
import { writeToOutput } from "../../lib/utils/writeOutput.js";
import { Winner } from "../../types.js";

/**
 * @name CompileWinners
 */
// @ts-ignore
export default class CompileWinners extends Command {
  static description =
    "Outputs the previous draw's depositors with a non-zero balance for a PrizePool to a JSON file in a target directory.";
  static examples = [
    `$ ptv5 utils vaultAccounts --chainId 1 --prizePool 0x0000000000000000000000000000000000000000 --outDir ./depositors --contractJsonUrl 'https://raw.githubusercontent.com/GenerationSoftware/pt-v5-testnet/.../contracts.json' --subgraphUrl 'https://api.studio.thegraph.com/query/...'
       Running utils:vaultAccounts on chainId: 1 for prizePool: 0x0 using latest drawID
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

  // TODO: Fix this so it makes sense with new v5:
  public async catch(error: any): Promise<any> {
    console.log(error, "_error vaultAccounts");
    const { flags } = await this.parse(VaultAccounts);
    const { chainId, prizePool, outDir, contractJsonUrl, subgraphUrl } = flags;

    const readProvider = getProvider();

    const prizePoolContract = await getPrizePoolByAddress(
      Number(chainId),
      contractJsonUrl,
      prizePool,
      readProvider
    );

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
    const { chainId, prizePool, outDir, contractJsonUrl, subgraphUrl } = flags;

    console.log("");
    console.log(`Running "utils:vaultAccounts"`);
    console.log("");

    const readProvider = getProvider();
    const prizePoolContract = await getPrizePoolByAddress(
      Number(chainId),
      contractJsonUrl,
      prizePool,
      readProvider
    );
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
    writeToOutput(outDirWithSchema, "status", VaultAccounts.statusLoading);

    /* -------------------------------------------------- */
    // Data Fetching && Compute
    /* -------------------------------------------------- */
    const contracts = await downloadContractsBlob(contractJsonUrl);
    const prizePoolInfo: PrizePoolInfo = await getPrizePoolInfo(readProvider, contracts);

    const { prizeVaults, numAccounts } = await getAllPrizeVaultsAndAccountsWithBalance(
      subgraphUrl,
      prizePoolInfo
    );

    /* -------------------------------------------------- */
    // Write Depositors to Disk
    /* -------------------------------------------------- */
    await writeDepositorsToOutput(outDirWithSchema, chainId, prizePool, prizeVaults);

    /* -------------------------------------------------- */
    // Write Winners to Disk
    /* -------------------------------------------------- */
    await writeWinnersToOutput(outDirWithSchema, Number(chainId), prizePool, prizeVaults);

    /* -------------------------------------------------- */
    // Write to Disk
    /* -------------------------------------------------- */
    await writeCombinedWinnersToOutput(outDirWithSchema, prizeVaults);

    /* -------------------------------------------------- */
    // Write Status to Disk
    /* -------------------------------------------------- */
    const statusSuccess = updateStatusSuccess(CompileWinners.statusLoading.createdAt, {
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
      multicallBatchSize: 1024,
      userAddresses,
    };

    writeToOutput(outDir, prizeVault.id.toLowerCase(), vaultJson);
  }
}

export async function writeWinnersToOutput(
  outDirWithSchema: string,
  chainId: number,
  prizePool: string,
  vaults: PrizeVault[]
): Promise<void> {
  console.log("# Writing winners to output ...");
  console.log("");

  let winnersJson: Record<string, Winner[]> = {};
  for (const vault of Object.values(vaults)) {
    const vaultId = vault.id.toLowerCase();
    const fileJson = readFileSync(`${outDirWithSchema}${vaultId}.json`, "utf8");

    const userAddresses = JSON.parse(fileJson).userAddresses;

    const winners = await computeWinners({
      chainId,
      rpcUrl: process.env.RPC_URL as string,
      prizePoolAddress: `0x${prizePool.replace(/^0x/, "")}`,
      vaultAddress: `0x${vaultId.replace(/^0x/, "")}`,
      userAddresses,
      multicallBatchSize: 1024,
    });

    winnersJson["winners"] = winners;

    console.log(`Writing ${outDirWithSchema}${vaultId}-winners.json`);
    writeToOutput(outDirWithSchema, `${vaultId}-winners`, winnersJson);
  }
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
