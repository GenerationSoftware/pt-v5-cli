import { writeFileSync, mkdirSync } from "fs";
type File = any;

export function writeToOutput(outputDir: string, fileName: string, blob: File): void {
  mkdirSync(outputDir, { recursive: true });
  const outputFilePath = `${outputDir}/${fileName}.json`;
  writeFileSync(outputFilePath, JSON.stringify(blob, null, 2));
}

export function writeStatus(outputDir: string, json: any): void {
  writeToOutput(outputDir, "status", json);
}
