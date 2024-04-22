import {
  PrizePoolInfo,
  PrizeVault,
  getSubgraphPrizeVaults,
  populateSubgraphPrizeVaultAccounts,
} from "@generationsoftware/pt-v5-utils-js";

export const getAllPrizeVaultsAndAccountsWithBalance = async (
  chainId: number,
  prizePoolInfo: PrizePoolInfo
): Promise<{ prizeVaults: PrizeVault[]; numAccounts: number }> => {
  // #1. Collect all prizeVaults
  console.log();
  console.log(`Getting prize vaults from subgraph ...`);
  let prizeVaults = await getSubgraphPrizeVaults(chainId);
  if (prizeVaults.length === 0) {
    throw new Error("Claimer: No prizeVaults found in subgraph");
  }

  // #2. Page through and concat all accounts for all prizeVaults
  console.log();
  console.log(
    `Getting depositors for each vault with a non-zero balance in the previous draw from subgraph ...`
  );

  // #3. Figure out the longest duration (in seconds) that the biggest tier (grandPrize tier) spans
  const maxTierPeriodSeconds =
    prizePoolInfo.drawPeriodSeconds * prizePoolInfo.grandPrizePeriodDraws;

  // #4. Get a range of the oldest timestamp we want to start querying at to the current closed draw timestmap
  // for use in scoping depositors when querying the Graph
  const startTimestamp = prizePoolInfo.lastDrawClosedAt - maxTierPeriodSeconds;
  const endTimestamp = prizePoolInfo.lastDrawClosedAt;

  // #5. Query and populate accounts for each vault
  prizeVaults = await populateSubgraphPrizeVaultAccounts(
    chainId,
    prizeVaults,
    startTimestamp,
    endTimestamp
  );

  const numAccounts = prizeVaults.reduce(
    (accumulator, vault) => vault.accounts.length + accumulator,
    0
  );
  console.log();
  console.log(`${numAccounts} accounts deposited across ${prizeVaults.length} prizeVaults.`);
  console.log();
  console.log();

  return { prizeVaults, numAccounts };
};
