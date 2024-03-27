import { Claim, Vault } from '@generationsoftware/pt-v5-utils-js'
import { readFileSync, writeFileSync, mkdirSync} from 'fs'
type File = any

import { Winner } from '../../types'

export function writePrizesToOutput(
  outDir: string,
  claims: Claim[],
): void {
  const winners = groupByWinner(claims)

  for (const winner of Object.entries(winners)) {
    const [winnerAddress, value] = winner
    writeToOutput(outDir, winnerAddress.toLowerCase(), value)
  }
}

export function writeToOutput(
  outputDir: string,
  fileName: string,
  blob: File,
): void {
  mkdirSync(outputDir, {recursive: true})
  const outputFilePath = `${outputDir}/${fileName}.json`
  writeFileSync(outputFilePath, JSON.stringify(blob, null, 2))
}

export function writeStatus(outputDir: string, json: any): void {
  writeToOutput(outputDir, 'status', json)
}

const groupByWinner = (claims: any) =>{
  return claims.reduce(function (accumulator:any, value:any) {
        accumulator[value.winner] = accumulator[value.winner] || [];
        accumulator[value.winner].push(value);
        return accumulator;
    }, {});
}

export function writeCombinedWinnersToOutput(
  outDirWithSchema: string,
  vaults: Vault[]
): void {
  console.log("Writing depositors to output ...");

  let winnersJson: Record<string, Winner[]> = {};
  for (const vault of Object.values(vaults)) {
    const fileJson = readFileSync(`${outDirWithSchema}${vault.id.toLowerCase()}.json`, 'utf8');
    console.log(fileJson);

    winnersJson[vault.id.toLowerCase()] = JSON.parse(fileJson).winners;
  }

  writeToOutput(outDirWithSchema, "winners", winnersJson);
}
