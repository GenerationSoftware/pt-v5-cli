<p align="center">
  <img src="https://raw.githubusercontent.com/GenerationSoftware/pt-v5-utils-js/main/img/pooltogether-logo--purple@2x.png?raw=true" alt="PoolTogether Brand" style="max-width:100%;" width="300">
</p>

<br />

# 🖥️ PoolTogether V5

### CLI

The `@generationsoftware/pt-v5-cli` [node module package](https://www.npmjs.com/package/@generationsoftware/pt-v5-cli) is a Node command line interface (CLI) to interact with the **PoolTogether V5 protocol**. The CLI uses the `v5-autotasks-library` modules to fetch and run calculations/computations for essential PoolTogether V5 tasks.

Primary CLI Commands (help)

```sh
npx @generationsoftware/pt-v5-cli help compute drawPrizes
```

# ⌨️ CLI Installation

<!-- usage -->
```sh-session
$ npm install -g @generationsoftware/pt-v5-cli
$ ptv5 COMMAND
running command...
$ ptv5 (--version)
@generationsoftware/pt-v5-cli/0.0.1-beta.47 darwin-arm64 node-v18.16.0
$ ptv5 --help [COMMAND]
USAGE
  $ ptv5 COMMAND
...
```
<!-- usagestop -->

# Commands

## Compute Draw Prizes

```sh-session
ptv5 compute drawPrizes
```

Computes the previous draw's prizes for a PrizePool to a target output directory.

Simply pass a `chainId`, `prizePool` and `outDir` to compute and locally save the results.

```
USAGE
  $ ptv5 compute drawPrizes --chainId 1 --outDir ./temp --prizePool '0xdd4d117723C257CEe402285D3aCF218E9A8236E1'

DESCRIPTION
  Computes the previous draw's prizes for a PrizePool to a target output directory.

EXAMPLES
  $ ptv5 compute drawPrizes --chainId 1 --prizePool 0x0000000000000000000000000000000000000000 --outDir ./temp
    Running compute:drawPrizes on chainId: 1
```

## Prizes File (prizes.json)

```json
[
  {
    "vault": "0x0bfe04201c496a9994b920deb6087a60bdadfbbb",
    "winner": "0x07967251f6db5f9d095119379bd8fc4fce60b3e1",
    "tier": 3,
    "prizeIndex": 11,
    "claimed": true,
    "amount": "1633936709514027714"
  },
  {
    "vault": "0x0bfe04201c496a9994b920deb6087a60bdadfbbb",
    "winner": "0x084039db4e3c6775eabfc59cbd3725d3d9a6d752",
    "tier": 2,
    "prizeIndex": 1,
    "claimed": false,
    "amount": "1633936709514027714"
  }
]
```

## Status File (status.json)

```json
{
  "status": "LOADING",
  "createdAt": "11"
}
```

### Success

```json
{
  "status": "SUCCESS",
  "createdAt": 1693423691768,
  "updatedAt": 1693423805132,
  "runtime": 114,
  "meta": {
    "numVaults": 7,
    "numTiers": 3,
    "numPrizeIndices": 21,
    "numAccounts": 3830,
    "numPrizes": 21,
    "prizePoolReserve": "431450369493570544008",
    "amountsTotal": "318001330964753848953",
    "tierPrizeAmounts": {
      "0": "271304907889060131200",
      "1": "45062486366179690039",
      "2": "1633936709514027714"
    },
    "vaultPortions": {
      "0x0410cae69dd01f58224d54881648e35c6cb874fa": "12491920408565",
      "0x0bfe04201c496a9994b920deb6087a60bdadfbbb": "973235150974337855",
      "0x4b7a2e1a70ea05523542c9189fa51b133884f321": "232229504251603",
      "0x9e11c3d53a68c07f6d839e5d89a94052753cedcb": "5916502876505634",
      "0xb9a647d3391b939cb49b44d3c5e93c63d96ad4a4": "9173734225780914",
      "0xe2ef926250b0e8a07578d76d9f57e5092340a6fa": "11429890498715426",
      "0xffb08a9ffc360806be7ef8cf815c1274ef92cea9": "0"
    }
  }
}
```

### Failure

```json
{
  "status": "FAILURE",
  "createdAt": "11",
  "updatedAt": "33",
  "runtime": "22",
  "error": "ErrorCode"
}
```

## Help

```sh-session
ptv5 help [COMMAND]
```

Display help for ptv5.

```
USAGE
  $ ptv5 help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for ptv5.
```

## Development

### Using the tool in dev

You can test the CLI while developing by using the following, with whichever chain / prizePool flags you want to test with:

```
./bin/run.js compute drawPrizes --chainId 80001 -o ./temp -p '0xA32C8f94191c9295634f0034eb2b0e2749e77974'
```
