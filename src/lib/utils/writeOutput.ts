import { Claim } from '@generationsoftware/pt-v5-utils-js'
import { writeFileSync, mkdirSync} from 'fs'
type File = any

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

