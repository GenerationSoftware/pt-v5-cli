<p align="center">
  <img src="https://raw.githubusercontent.com/GenerationSoftware/pt-v5-utils-js/main/img/pooltogether-logo--purple@2x.png?raw=true" alt="PoolTogether Brand" style="max-width:100%;" width="300">
</p>

<br />

# 🖥️ PoolTogether V5

### CLI

The `@generationsoftware/pt-v5-cli` [node module package](https://www.npmjs.com/package/@generationsoftware/pt-v5-cli) is a Node command line interface (CLI) to interact with the **PoolTogether V5 protocol**. The CLI uses the `pt-v5-utils-js` package to fetch and run calculations/computations for essential PoolTogether V5 tasks.

Primary CLI Commands (help)

```sh
npx @generationsoftware/pt-v5-cli help utils compileWinners
```

### Setup

Set up your environment variables using `dotenv`:

#### ENV

Copy `.envrc.example` and input the env vars needed to run this project:

```sh
cp .envrc.example .envrc
```

Once your env variables are setup, load them with:

```sh
direnv allow
```

#### LIST OF ENVIRONMENT VARIABLES

```sh
JSON_RPC_URL: Your Infura/Alchemy/etc JSON RPC URI
```

# ⌨️ CLI Installation

<!-- usage -->

```sh-session
$ npm install -g @generationsoftware/pt-v5-cli
$ ptv5 COMMAND
running command...
$ ptv5 (--version)
@generationsoftware/pt-v5-cli/1.1.1 darwin-arm64 node-v18.17.0
$ ptv5 --help [COMMAND]
USAGE
  $ ptv5 COMMAND
...
```

<!-- usagestop -->

# Commands

## Compile Winners

```sh-session
ptv5 utils compileWinners
```

Finds draw's depositors with a non-zero balance for a PrizePool, then computes who won and outputs all this data to a target output directory.

Pass the `chainId`, `prizePool`, `outDir`, `contractJsonUrl` and `subgraphUrl` to compute and locally save the results.

```
USAGE
  $ ptv5 utils compileWinners --chainId 1 --outDir ./winners --prizePool '0xdd4d117723C257CEe402285D3aCF218E9A8236E1' --contractJsonUrl 'https://raw.githubusercontent.com/GenerationSoftware/pt-v5-testnet/.../contracts.json' --subgraphUrl 'https://api.studio.thegraph.com/query/...'

DESCRIPTION
  Finds draw's depositors with a non-zero balance for a PrizePool, then computes who won and outputs all this data to a target output directory.

EXAMPLES
  $ ptv5 utils compileWinners --chainId 1 --prizePool 0x0000000000000000000000000000000000000000 --outDir ./winners --contractJsonUrl 'https://raw.githubusercontent.com/GenerationSoftware/pt-v5-testnet/.../contracts.json' --subgraphUrl 'https://api.studio.thegraph.com/query/...'
    Running utils:compileWinners on chainId: 1
```

## Vaults Files ([vaultAddress].json)

```json
{
  "chainId": 10,
  "prizePoolAddress": "0xe32e5E1c5f0c80bD26Def2d0EA5008C107000d6A",
  "vaultAddress": "0xf0B19f02c63d51B69563A2b675e0160e1C34397C",
  "userAddresses": [
    "0x07967251f6db5f9d095119379bd8fc4fce60b3e1",
    "0x084039db4e3c6775eabfc59cbd3725d3d9a6d752"
    // ...
  ],
  "winners": [
    {
      "user": "0xBBBBBBBBBBBB0af42Df6C28e5cd79458C102f6",
      "prizes": {
        "3": [3, 7, 30],
        "4": [11, 55]
      }
    }
    // ...
  ]
}
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
    "numAccounts": 3830
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

You can test the CLI while developing by using the following, with whichever chain & prizePool flags you want to test with:

```
./bin/dev.js utils compileWinners --chainId 1 --outDir ./winners --prizePool '0xdd4d117723C257CEe402285D3aCF218E9A8236E1' --contractJsonUrl 'https://raw.githubusercontent.com/GenerationSoftware/pt-v5-testnet/.../contracts.json' --subgraphUrl 'https://api.studio.thegraph.com/query/...'
```
