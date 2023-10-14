import { BigNumber, ethers, Contract } from "ethers";
import { Provider } from "@ethersproject/providers";
import { Command, Flags } from "@oclif/core";
import {
  downloadContractsBlob,
  getPrizePoolInfo,
  Claim,
  PrizePoolInfo,
  getSubgraphVaults,
  populateSubgraphVaultAccounts,
  getWinnersClaims,
  flagClaimedRpc,
} from "@generationsoftware/pt-v5-utils-js";
import * as core from "@actions/core";

import { createStatus, updateStatusFailure, updateStatusSuccess } from "../../lib/utils/status";
import { getProvider } from "../../lib/utils/getProvider";
import { createOutputPath } from "../../lib/utils/createOutputPath";
import { createExitCode } from "../../lib/utils/createExitCode";
import { writeToOutput, writePrizesToOutput } from "../../lib/utils/writeOutput";
import {
  sumPrizeAmounts,
  mapTierPrizeAmountsToString,
  addTierPrizeAmountsToClaims,
  addUserAndTotalSupplyTwabsToClaims,
  TierPrizeAmounts,
} from "../../lib/utils/prizeAmounts";

/**
 * @name DrawPrizes
 */
// @ts-ignore
export default class DrawPrizes extends Command {
  static description =
    "Computes the previous draw's prizes for a PrizePool to a target output directory.";
  static examples = [
    `$ ptv5 compute drawPrizes --chainId 1 --prizePool 0x0000000000000000000000000000000000000000 --outDir ./temp
       Running compute:drawPrizes on chainId: 1 for prizePool: 0x0 using latest drawID
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
    this.log(error, "_error drawPrizes");
    const { flags } = await this.parse(DrawPrizes);
    const { chainId, prizePool, outDir } = flags;

    const readProvider = getProvider(chainId);

    const prizePoolContract = await getPrizePoolByAddress(Number(chainId), prizePool, readProvider);

    const drawId = await prizePoolContract?.getLastAwardedDrawId();

    this.warn("Failed to calculate Draw Prizes (" + error + ")");
    const statusFailure = updateStatusFailure(DrawPrizes.statusLoading.createdAt, error);

    const outDirWithSchema = createOutputPath(outDir, chainId, prizePool.toLowerCase(), drawId);
    writeToOutput(outDirWithSchema, "status", statusFailure);
    createExitCode(error, this);

    core.setOutput("error", error);
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(DrawPrizes);
    const { chainId, prizePool, outDir } = flags;

    this.log("");
    this.log(
      `Running "calculate:prizes" on chainId: ${chainId} for prizePool: ${prizePool.toLowerCase()} using latest drawID`
    );

    const readProvider = getProvider(chainId);
    const prizePoolContract = await getPrizePoolByAddress(Number(chainId), prizePool, readProvider);
    const drawId = await prizePoolContract?.getLastAwardedDrawId();
    this.log(`DrawID: #${drawId.toString()}`);

    /* -------------------------------------------------- */
    // Create Status File
    /* -------------------------------------------------- */
    const outDirWithSchema = createOutputPath(outDir, chainId, prizePool, drawId);
    writeToOutput(outDirWithSchema, "status", DrawPrizes.statusLoading);

    /* -------------------------------------------------- */
    // Data Fetching && Compute
    /* -------------------------------------------------- */
    // Find out how much each tier won
    const contracts = await downloadContractsBlob(Number(chainId));
    const prizePoolInfo = await getPrizePoolInfo(readProvider, contracts);

    const tierPrizeAmounts: TierPrizeAmounts = {};
    Object.entries(prizePoolInfo.tierPrizeData).forEach(
      (tier) => (tierPrizeAmounts[tier[0]] = tier[1].amount)
    );

    // #2. Collect all vaults
    this.log(`getSubgraphVaults`);
    let vaults = await getSubgraphVaults(Number(chainId));
    if (vaults.length === 0) {
      throw new Error("Claimer: No vaults found in subgraph");
    }

    // #3. Page through and concat all accounts for all vaults
    this.log(`populateSubgraphVaultAccounts`);
    vaults = await populateSubgraphVaultAccounts(Number(chainId), vaults);

    // #4. Determine winners for last draw
    let claims: Claim[] = await getWinnersClaims(readProvider, prizePoolInfo, contracts, vaults);

    // #5. Cross-reference prizes claimed subgraph to flag if a claim has been claimed or not
    claims = await flagClaimedRpc(readProvider, contracts, claims);

    // This is a handy one-liner for the above but doesn't allow us to get the # of depositors to stash in the json:
    // const claims: Claim[] = await computeDrawWinners(readProvider, contracts, Number(chainId));

    this.log(``);
    this.log(`${claims.length.toString()} prizes.`);

    const numAccounts = vaults.reduce(
      (accumulator, vault) => vault.accounts.length + accumulator,
      0
    );
    this.log(`${numAccounts} accounts deposited across ${vaults.length} vaults.`);

    const claimsWithPrizeAmounts = addTierPrizeAmountsToClaims(claims, tierPrizeAmounts);

    /* -------------------------------------------------- */
    // Write to Disk
    /* -------------------------------------------------- */
    this.log(`writeToOutput prizes`);
    writeToOutput(outDirWithSchema, "prizes", claimsWithPrizeAmounts);
    writePrizesToOutput(outDirWithSchema, claimsWithPrizeAmounts);

    this.log(`updateStatusSuccess`);
    const statusSuccess = updateStatusSuccess(DrawPrizes.statusLoading.createdAt, {
      numVaults: vaults.length,
      numTiers: prizePoolInfo.numTiers,
      numPrizeIndices: prizePoolInfo.numPrizeIndices,
      numAccounts,
      numPrizes: claims.length,
      prizePoolReserve: prizePoolInfo.reserve,
      amountsTotal: sumPrizeAmounts(tierPrizeAmounts),
      tierPrizeAmounts: mapTierPrizeAmountsToString(tierPrizeAmounts),
      vaultPortions: mapBigNumbersToStrings(
        await getVaultPortions(Number(chainId), prizePoolContract, prizePoolInfo)
      ),
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
  const vaultPortions: Record<string, BigNumber> = {};

  const startDrawId = prizePoolInfo.drawId;
  const endDrawId = startDrawId + 1;

  let vaults = await getSubgraphVaults(chainId);
  if (vaults.length === 0) {
    throw new Error("Claimer: No vaults found in subgraph");
  }

  for (let vault of vaults) {
    vaultPortions[vault.id] = await prizePoolContract.getVaultPortion(
      vault.id,
      startDrawId,
      endDrawId
    );
  }

  return vaultPortions;
};
