import yn from "yn";
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
import { Address } from "viem";

import { createStatus, updateStatusFailure, updateStatusSuccess } from "../../lib/utils/status.js";
import { getProvider } from "../../lib/utils/getProvider.js";
import { createOutputPath } from "../../lib/utils/createOutputPath.js";
import { createExitCode } from "../../lib/utils/createExitCode.js";
import { getAllPrizeVaultsAndAccountsWithBalance } from "../../lib/utils/getAllPrizeVaultsAndAccountsWithBalance.js";
import { getPrizePoolByAddress } from "../../lib/utils/getPrizePoolByAddress.js";
import { writeToOutput } from "../../lib/utils/writeOutput.js";
import { Winner } from "../../types.js";

const DEFAULT_RETRY_ATTEMPTS = 10;
const DEFAULT_RETRY_INTERVAL = 5;

/**
 * @name CompileWinners
 */
// @ts-ignore
export default class CompileWinners extends Command {
  static description =
    "Finds draw's depositors with a non-zero balance for a PrizePool, then computes who won and outputs all this data to a target output directory.";
  static examples = [
    `$ ptv5 utils compileWinners --chainId 1 --prizePool 0x0000000000000000000000000000000000000000 --outDir ./depositors --contractJsonUrl 'https://raw.githubusercontent.com/GenerationSoftware/pt-v5-testnet/.../contracts.json' --subgraphUrl 'https://api.studio.thegraph.com/query/...'
       Running utils:compileWinners on chainId: 1 for prizePool: 0x0 using latest drawID
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
    console.log(error, "_error compileWinners");
    const { flags } = await this.parse(CompileWinners);
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
    const statusFailure = updateStatusFailure(CompileWinners.statusLoading.createdAt, error);

    const outDirWithSchema = createOutputPath(outDir, chainId, prizePool.toLowerCase(), drawId);
    writeToOutput(outDirWithSchema, "status", statusFailure);
    createExitCode(error, this);

    core.setOutput("error", error);
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(CompileWinners);
    const { chainId, prizePool, outDir, contractJsonUrl, subgraphUrl } = flags;

    console.log("");
    console.log(`Running "utils:compileWinners"`);
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
    console.log(`---`);
    console.log(`JSON_RPC_URL:     ${process.env.JSON_RPC_URL}`);
    console.log(`DEBUG:            ${yn(process.env.DEBUG)}`);

    /* -------------------------------------------------- */
    // Create Status File
    /* -------------------------------------------------- */
    const outDirWithSchema = createOutputPath(outDir, chainId, prizePool, drawId);
    writeToOutput(outDirWithSchema, "status", CompileWinners.statusLoading);

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
    // Write Depositors & Winners to Disk
    /* -------------------------------------------------- */
    await writeDepositorsToOutput(outDirWithSchema, Number(chainId), prizePool, prizeVaults);
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

export async function writeDepositorsToOutput(
  outDir: string,
  chainId: number,
  prizePoolAddress: string,
  prizeVaults: PrizeVault[]
): Promise<void> {
  console.log("# Writing depositors & winners to output ...");
  console.log("");

  for (const prizeVault of Object.values(prizeVaults)) {
    const vaultId = prizeVault.id.toLowerCase() as Address;
    const userAddresses = prizeVault.accounts.map((account) => account.user.address as Address);

    console.log(`  -- Processing vault ${vaultId}`);
    console.log(`     Computing winners ...`);
    const fxnToAttempt = async () => {
      return await computeWinners({
        chainId,
        rpcUrl: process.env.JSON_RPC_URL as string,
        prizePoolAddress: prizePoolAddress as Address,
        vaultAddress: vaultId as Address,
        userAddresses,
        multicallBatchSize: 1024 * 8,
        debug: yn(process.env.DEBUG),
      });
    };

    const winners = await tryNTimes({ fxnToAttempt, times: 5, interval: 1 });

    const vaultJson = {
      chainId,
      prizePoolAddress,
      vaultAddress: prizeVault.id,
      userAddresses,
      winners,
    };

    console.log(`     Writing ${outDir}${vaultId}.json`);
    console.log(``);
    writeToOutput(outDir, prizeVault.id.toLowerCase(), vaultJson);
  }
}

export function writeCombinedWinnersToOutput(outDir: string, vaults: PrizeVault[]): void {
  console.log("# Writing combined winners.json file ...");
  console.log("");

  let winnersJson: Record<string, Winner[]> = {};
  for (const vault of Object.values(vaults)) {
    const fileJson = readFileSync(`${outDir}${vault.id.toLowerCase()}.json`, "utf8");

    winnersJson[vault.id.toLowerCase()] = JSON.parse(fileJson).winners;
  }

  console.log(`     Writing ${outDir}winners.json`);
  writeToOutput(outDir, "winners", winnersJson);
}

/**
 * @async
 * @function tryNTimes<T> Tries to resolve a {@link Promise<T>} N times, with a delay between each attempt.
 * @param {Object} options Options for the attempts.
 * @param {() => Promise<T>} options.fxnToAttempt The {@link Promise<T>} to try to resolve.
 * @param {number} [options.times=5] The maximum number of attempts (must be greater than 0).
 * @param {number} [options.interval=1] The interval of time between each attempt in seconds.
 * @returns {Promise<T>} The resolution of the {@link Promise<T>}.
 */
export async function tryNTimes<T>({
  fxnToAttempt,
  times = DEFAULT_RETRY_ATTEMPTS,
  interval = DEFAULT_RETRY_INTERVAL,
}: {
  fxnToAttempt: () => Promise<T>;
  times?: number;
  interval?: number;
}): Promise<Awaited<T>> {
  if (times < 1) {
    throw new Error(`Bad argument: 'times' must be greater than 0, but ${times} was received.`);
  }

  let attemptCount = 0;
  while (true) {
    try {
      if (attemptCount > 0) {
        console.log(`     Retrying:`);
      }
      console.log(`     Attempt #${attemptCount + 1} ...`);
      return await fxnToAttempt();
    } catch (error) {
      console.log("     error:");
      console.error(`     ${error}`);
      if (++attemptCount >= times) throw error;
    }

    await delay(interval);
  }
}

/**
 * @function delay Delays the execution of an action.
 * @param {number} time The time to wait in seconds.
 * @returns {Promise<void>}
 */
export function delay(time: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, time * 1000));
}
