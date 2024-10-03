import yn from "yn";
import { Contract } from "ethers";
import { readFileSync } from "fs";
import { Command, Flags } from "@oclif/core";
import {
  downloadContractsBlob,
  getPrizePoolInfo,
  PrizeVault,
  PrizePoolInfo,
} from "@generationsoftware/pt-v5-utils-js";
import * as core from "@actions/core";
import { computeWinners } from "@generationsoftware/js-winner-calc";
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
    multicallAddress: Flags.string({
      char: "m",
      description: "Custom address for a Multicall contract",
      required: false,
    }),
  };

  static args = [];
  static statusLoading = createStatus();

  // TODO: Fix this so it makes sense with new v5:
  public async catch(error: any): Promise<any> {
    console.log(error, "_error compileWinners");
    const { flags } = await this.parse(CompileWinners);
    const { chainId, prizePool, outDir, contractJsonUrl } = flags;

    const readProvider = getProvider();

    const prizePoolContract = await getPrizePoolByAddress(
      Number(chainId),
      contractJsonUrl,
      prizePool,
      readProvider
    );

    const drawId = await getLastAwaradedDrawId(prizePoolContract);

    this.warn("Failed to fetch depositors (" + error + ")");
    const statusFailure = updateStatusFailure(CompileWinners.statusLoading.createdAt, error);

    if (drawId) {
      const outDirWithSchema = createOutputPath(outDir, chainId, prizePool.toLowerCase(), drawId);
      writeToOutput(outDirWithSchema, "status", statusFailure);
    }

    createExitCode(error, this);
    core.setOutput("error", error);
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(CompileWinners);
    const { chainId, prizePool, outDir, contractJsonUrl, subgraphUrl, multicallAddress } = flags;

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
    const drawId = await getLastAwaradedDrawId(prizePoolContract);

    console.log(`chainId:                ${chainId}`);
    console.log(`prizePool:              ${prizePool.toLowerCase()}`);
    console.log(`drawId:                 #${drawId ? drawId : ""}`);
    console.log(`contractJsonUrl:        ${contractJsonUrl}`);
    console.log(`subgraphUrl:            ${subgraphUrl}`);
    console.log(`outDir:                 ${outDir}`);
    console.log(`multicallAddress:       ${multicallAddress}`);
    console.log(`--- ENV ---`);
    console.log(`JSON_RPC_URL:           ${process.env.JSON_RPC_URL}`);
    console.log(`DEBUG:                  ${yn(process.env.DEBUG)}`);
    console.log(`PRIZE_TIERS_TO_COMPUTE: ${process.env.PRIZE_TIERS_TO_COMPUTE}`);

    if (!drawId) {
      console.log("");
      console.warn(
        "Exiting early, could not query prizePoolContract.getLastAwaradedDrawId() (PrizePool has not been awarded yet?)"
      );
      return;
    }

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

    const numAccounts = 100;
    // const { prizeVaults, numAccounts } = await getAllPrizeVaultsAndAccountsWithBalance(
    //   subgraphUrl,
    //   prizePoolInfo
    // );

    const prizeVaults: PrizeVault[] = [
      {
        id: "0xaaf954c54fae10877bf0a0ba9f5ca6129e13e450",
        accounts: [
          {
            id: "0x912699b3fac7a14c0db4188c740002e0ad50b5d7",
            user: { address: "0x912699b3fac7a14c0db4188c740002e0ad50b5d7" },
          },
          {
            id: "0xfe75a8de8d73b9eaaa48fe3f16d6d1dbc0a1d521",
            user: { address: "0xfe75a8de8d73b9eaaa48fe3f16d6d1dbc0a1d521" },
          },
          {
            id: "0x4b9b0cc30ef739dbaa44457f36bbad8747ad5629",
            user: { address: "0x4b9b0cc30ef739dbaa44457f36bbad8747ad5629" },
          },
          {
            id: "0x809a58a4ba960edaac5c46c9686d9204cce8af8d",
            user: { address: "0x809a58a4ba960edaac5c46c9686d9204cce8af8d" },
          },
          {
            id: "0xa91386ffa5ad79def1ee8ecb13f16cc68bcf79a9",
            user: { address: "0xa91386ffa5ad79def1ee8ecb13f16cc68bcf79a9" },
          },
          {
            id: "0x85d7a161b0b3221cf30fbf844630ff6543105a5a",
            user: { address: "0x85d7a161b0b3221cf30fbf844630ff6543105a5a" },
          },
          {
            id: "0x9b21342404d6bf9377a9bd1bea7836a584bd3a7d",
            user: { address: "0x9b21342404d6bf9377a9bd1bea7836a584bd3a7d" },
          },
          {
            id: "0xb1cfab3570dd93dbb0ac49b47fdb358ee597f98f",
            user: { address: "0xb1cfab3570dd93dbb0ac49b47fdb358ee597f98f" },
          },
          {
            id: "0xc222f78f58edc218fe27a2bd0126feef7b43e8ce",
            user: { address: "0xc222f78f58edc218fe27a2bd0126feef7b43e8ce" },
          },
          {
            id: "0xd07aec65d8af978a10cd591a2058e3dd4bb1cfd3",
            user: { address: "0xd07aec65d8af978a10cd591a2058e3dd4bb1cfd3" },
          },
          {
            id: "0x85c29d61899e9b8bd6119d99e0a969e7f02b1bf7",
            user: { address: "0x85c29d61899e9b8bd6119d99e0a969e7f02b1bf7" },
          },
          {
            id: "0x85b34fd97561cdd8216cb713b4c4f0ab8301b0b4",
            user: { address: "0x85b34fd97561cdd8216cb713b4c4f0ab8301b0b4" },
          },
        ],
      },
      {
        id: "0xd262c57b43b9198e5375dd28fb6bcfe86557b4e6",
        accounts: [
          {
            id: "0xfd97571750c6db78872bd5e7526f3b6191795c86",
            user: { address: "0xfd97571750c6db78872bd5e7526f3b6191795c86" },
          },
          {
            id: "0x01740229795c3bec8e42a3bbfdf3fb272ef3ac95",
            user: { address: "0x01740229795c3bec8e42a3bbfdf3fb272ef3ac95" },
          },
          {
            id: "0x5529e5a6a9c3d111d9abbea5b3d45043e323d87a",
            user: { address: "0x5529e5a6a9c3d111d9abbea5b3d45043e323d87a" },
          },
          {
            id: "0x08e6b66715f0d5472dd5d40d06bbd294acc329cf",
            user: { address: "0x08e6b66715f0d5472dd5d40d06bbd294acc329cf" },
          },
          {
            id: "0xa78abd42cf420d9b16802cac09d50a6dc1f6173b",
            user: { address: "0xa78abd42cf420d9b16802cac09d50a6dc1f6173b" },
          },
          {
            id: "0x95fbeeb2b6ef854119643348825aa0f987c53df0",
            user: { address: "0x95fbeeb2b6ef854119643348825aa0f987c53df0" },
          },
          {
            id: "0xf17344365a1c98f0e6038d6b6a15018a738032e8",
            user: { address: "0xf17344365a1c98f0e6038d6b6a15018a738032e8" },
          },
          {
            id: "0x6b28f622c64fa3dfd6e52bd5a2878b914ca43703",
            user: { address: "0x6b28f622c64fa3dfd6e52bd5a2878b914ca43703" },
          },
          {
            id: "0x1a826e20dbe2e7ab610b9d02ca8d7e6726eaea8b",
            user: { address: "0x1a826e20dbe2e7ab610b9d02ca8d7e6726eaea8b" },
          },
          {
            id: "0xafab1a1a9b9a50ae411fa150c187c638d025a13a",
            user: { address: "0xafab1a1a9b9a50ae411fa150c187c638d025a13a" },
          },
          {
            id: "0x46e97701aabe58a3778782089670085344a603bc",
            user: { address: "0x46e97701aabe58a3778782089670085344a603bc" },
          },
          {
            id: "0x065a5bdd2692d2cdb0500ec2d81372dd3c330f29",
            user: { address: "0x065a5bdd2692d2cdb0500ec2d81372dd3c330f29" },
          },
          {
            id: "0xa6d23fef684e07f1b7d3dc309d883bb87db72ab2",
            user: { address: "0xa6d23fef684e07f1b7d3dc309d883bb87db72ab2" },
          },
          {
            id: "0x02de9a536c56cdee41d34edeae219b5c44cf55ad",
            user: { address: "0x02de9a536c56cdee41d34edeae219b5c44cf55ad" },
          },
          {
            id: "0x63c889a727f04b30079eb73548b708ca0d41e7a6",
            user: { address: "0x63c889a727f04b30079eb73548b708ca0d41e7a6" },
          },
          {
            id: "0x1a861c699ddf3b3e0d3c6e269e00bae0c0cfdd53",
            user: { address: "0x1a861c699ddf3b3e0d3c6e269e00bae0c0cfdd53" },
          },
          {
            id: "0x1be5acabbfe9dea3ceccb90d15ff02d5b43e5c52",
            user: { address: "0x1be5acabbfe9dea3ceccb90d15ff02d5b43e5c52" },
          },
          {
            id: "0x074356b16e88c5010318c0660a0f0491c4e19c7c",
            user: { address: "0x074356b16e88c5010318c0660a0f0491c4e19c7c" },
          },
          {
            id: "0x9d389fcdc3e6f6046c19cf693378ba1251713810",
            user: { address: "0x9d389fcdc3e6f6046c19cf693378ba1251713810" },
          },
          {
            id: "0xd13dcffce049a33cd836ea04c18d1d1b10739c87",
            user: { address: "0xd13dcffce049a33cd836ea04c18d1d1b10739c87" },
          },
          {
            id: "0x289d6828531b13358095784011cc3a145055bf97",
            user: { address: "0x289d6828531b13358095784011cc3a145055bf97" },
          },
          {
            id: "0x65eb62016b68b0da66779c4831bd1cd1ca70e20c",
            user: { address: "0x65eb62016b68b0da66779c4831bd1cd1ca70e20c" },
          },
          {
            id: "0x3d78585bcd87c3016d863511c7ddaddf1680f327",
            user: { address: "0x3d78585bcd87c3016d863511c7ddaddf1680f327" },
          },
          {
            id: "0x18b96010706f65cdf0e9424221bb6bcf2ad067eb",
            user: { address: "0x18b96010706f65cdf0e9424221bb6bcf2ad067eb" },
          },
          {
            id: "0xf179ff61792bdcfbf54ba13d964d7cce09be872f",
            user: { address: "0xf179ff61792bdcfbf54ba13d964d7cce09be872f" },
          },
          {
            id: "0xde0019d261180e5c9ad81f2178ac06c5e8dcf976",
            user: { address: "0xde0019d261180e5c9ad81f2178ac06c5e8dcf976" },
          },
          {
            id: "0x4fd0fe07c8b53d839b8010c989b609c4f9487ace",
            user: { address: "0x4fd0fe07c8b53d839b8010c989b609c4f9487ace" },
          },
          {
            id: "0x00b82ab94da8dffcb1fe3fa4369122a9e20ac9b1",
            user: { address: "0x00b82ab94da8dffcb1fe3fa4369122a9e20ac9b1" },
          },
          {
            id: "0x10109e13f1d39687d9e4e2f2fafd3889bed0b64e",
            user: { address: "0x10109e13f1d39687d9e4e2f2fafd3889bed0b64e" },
          },
          {
            id: "0x3afa6db46533615f831c9abd8399e72a5a4b0e4b",
            user: { address: "0x3afa6db46533615f831c9abd8399e72a5a4b0e4b" },
          },
          {
            id: "0xe6ebb9e8bfd9420d5f5b884a1f156de65dfca953",
            user: { address: "0xe6ebb9e8bfd9420d5f5b884a1f156de65dfca953" },
          },
          {
            id: "0x29d74dac7f9344b6ee6fc20d77e7acad43d62d9a",
            user: { address: "0x29d74dac7f9344b6ee6fc20d77e7acad43d62d9a" },
          },
          {
            id: "0xaf5e19deebe3e077e2114bfe85c5d21fe51e3687",
            user: { address: "0xaf5e19deebe3e077e2114bfe85c5d21fe51e3687" },
          },
          {
            id: "0x2b8c8a107c48ebac777a16ca530796d77330a53d",
            user: { address: "0x2b8c8a107c48ebac777a16ca530796d77330a53d" },
          },
          {
            id: "0xbfa84651dd0145d921d1a185930243e21b3ff4cc",
            user: { address: "0xbfa84651dd0145d921d1a185930243e21b3ff4cc" },
          },
          {
            id: "0x1cd575ef68c9c29be086c2fa1b81eba627aa74ab",
            user: { address: "0x1cd575ef68c9c29be086c2fa1b81eba627aa74ab" },
          },
          {
            id: "0xad5c37aa3b41ba40a057299927670e2165df1a75",
            user: { address: "0xad5c37aa3b41ba40a057299927670e2165df1a75" },
          },
          {
            id: "0x62facd60bda5686baa2eb35cef59470a656d1951",
            user: { address: "0x62facd60bda5686baa2eb35cef59470a656d1951" },
          },
          {
            id: "0x417af88cc869cacf918c9afb0e498aed9302a0d7",
            user: { address: "0x417af88cc869cacf918c9afb0e498aed9302a0d7" },
          },
          {
            id: "0x8c280a2eb672c7c621c2e86cfe3863793fd537bf",
            user: { address: "0x8c280a2eb672c7c621c2e86cfe3863793fd537bf" },
          },
          {
            id: "0x15dc7a4d9a178b1aa7563e23aecad504774a57bd",
            user: { address: "0x15dc7a4d9a178b1aa7563e23aecad504774a57bd" },
          },
          {
            id: "0x18cd62017385c56858a3a4245fc103b2221cf0b3",
            user: { address: "0x18cd62017385c56858a3a4245fc103b2221cf0b3" },
          },
          {
            id: "0xdebf43dd4ab69c1a8f65416f80e6f8a22751e585",
            user: { address: "0xdebf43dd4ab69c1a8f65416f80e6f8a22751e585" },
          },
          {
            id: "0x6b9fe179cbd851e1bc1cac57c157bef0f114137a",
            user: { address: "0x6b9fe179cbd851e1bc1cac57c157bef0f114137a" },
          },
          {
            id: "0xe8dafdfcf95e90ebd83660858f3539a799809a47",
            user: { address: "0xe8dafdfcf95e90ebd83660858f3539a799809a47" },
          },
          {
            id: "0x08ec2c381ca8532e5427d65577d76043b57ff696",
            user: { address: "0x08ec2c381ca8532e5427d65577d76043b57ff696" },
          },
          {
            id: "0x49fe3a1986cb500748d5c6ac5f1a2d2ab50fdbb2",
            user: { address: "0x49fe3a1986cb500748d5c6ac5f1a2d2ab50fdbb2" },
          },
          {
            id: "0xfa5428528045c42ff3ed14e03bd241a5e28714ce",
            user: { address: "0xfa5428528045c42ff3ed14e03bd241a5e28714ce" },
          },
          {
            id: "0x864c932d6bf875cfde491fd1d3b83ae88cd06a53",
            user: { address: "0x864c932d6bf875cfde491fd1d3b83ae88cd06a53" },
          },
          {
            id: "0x01c9691f9ddca5bb2c6e54eb6e996c738bac3a62",
            user: { address: "0x01c9691f9ddca5bb2c6e54eb6e996c738bac3a62" },
          },
          {
            id: "0x51d75bf8d354832207c7f5fa69b48d3eec684373",
            user: { address: "0x51d75bf8d354832207c7f5fa69b48d3eec684373" },
          },
          {
            id: "0xb35aee635503451373711a174b9ccf6e4e314e5b",
            user: { address: "0xb35aee635503451373711a174b9ccf6e4e314e5b" },
          },
          {
            id: "0x80bbfacfcad1135f91f9fddf1c577899bb7526fe",
            user: { address: "0x80bbfacfcad1135f91f9fddf1c577899bb7526fe" },
          },
          {
            id: "0x49d944a75c424ac7327611a04b0fa8658bde3a25",
            user: { address: "0x49d944a75c424ac7327611a04b0fa8658bde3a25" },
          },
          {
            id: "0xc1ef6813a427cecc9a4af84abe64d0fe86f5f667",
            user: { address: "0xc1ef6813a427cecc9a4af84abe64d0fe86f5f667" },
          },
          {
            id: "0x7ef5f6d4f27678d85767144fcdfeca7743cfc4fc",
            user: { address: "0x7ef5f6d4f27678d85767144fcdfeca7743cfc4fc" },
          },
          {
            id: "0x115b09ea1f3f63bb7e8e93a11e44a989d5d9aa29",
            user: { address: "0x115b09ea1f3f63bb7e8e93a11e44a989d5d9aa29" },
          },
          {
            id: "0x2cb8279b62a6c4ab4811024cd65d744f3beabb02",
            user: { address: "0x2cb8279b62a6c4ab4811024cd65d744f3beabb02" },
          },
          {
            id: "0x294cc5e8a07a747822b8805424d6c11d63e9c1ab",
            user: { address: "0x294cc5e8a07a747822b8805424d6c11d63e9c1ab" },
          },
          {
            id: "0x3c948e2bf826e3f17f21b8b0378e3427ea8de34e",
            user: { address: "0x3c948e2bf826e3f17f21b8b0378e3427ea8de34e" },
          },
        ],
      },
    ];

    /* -------------------------------------------------- */
    // Write Depositors & Winners to Disk
    /* -------------------------------------------------- */
    await writeDepositorsToOutput(
      outDirWithSchema,
      Number(chainId),
      prizePool,
      prizeVaults,
      multicallAddress as Address
    );
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
  prizeVaults: PrizeVault[],
  multicallAddress?: Address
): Promise<void> {
  console.log("# Writing depositors & winners to output ...");
  console.log("");

  //   export interface PrizeVault {
  //     id: string;
  //     accounts: PrizeVaultAccount[];
  // }
  // export interface PrizeVaultAccount {
  //     id: string;
  //     user: User;
  // }

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
        multicallAddress,
        multicallBatchSize: 1024 * 2,
        debug: yn(process.env.DEBUG),
        prizeTiers: process.env.PRIZE_TIERS_TO_COMPUTE?.split(",").map((tier) => Number(tier)),
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

async function getLastAwaradedDrawId(prizePoolContract: Contract): Promise<string | undefined> {
  let drawId;
  try {
    drawId = await prizePoolContract.getLastAwardedDrawId();
  } catch (e: any) {
    console.warn(
      "Unable to query prizePoolContract.getLastAwaradedDrawId(), PrizePool has not been awarded yet?"
    );
    console.log("");
    // console.warn(e);
  }

  return drawId;
}
