import { PrizeVault } from "@generationsoftware/pt-v5-utils-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

import { Winner } from "../../types.js";

type File = any;

export function writeToOutput(outputDir: string, fileName: string, blob: File): void {
  mkdirSync(outputDir, { recursive: true });
  const outputFilePath = `${outputDir}/${fileName}.json`;
  writeFileSync(outputFilePath, JSON.stringify(blob, null, 2));
}

export function writeStatus(outputDir: string, json: any): void {
  writeToOutput(outputDir, "status", json);
}

export function writeCombinedWinnersToOutput(outDirWithSchema: string, vaults: PrizeVault[]): void {
  console.log("Writing depositors to output ...");

  let winnersJson: Record<string, Winner[]> = {};
  for (const vault of Object.values(vaults)) {
    const fileJson = readFileSync(`${outDirWithSchema}${vault.id.toLowerCase()}.json`, "utf8");
    console.log(fileJson);

    winnersJson[vault.id.toLowerCase()] = JSON.parse(fileJson).winners;
  }

  writeToOutput(outDirWithSchema, "winners", winnersJson);
}
