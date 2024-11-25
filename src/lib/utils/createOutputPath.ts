export function createOutputPath(
  outputDir: string,
  chainId: string,
  prizePoolAddress: string,
  drawId: string
): string {
  return `${outputDir}/${drawPath(chainId, prizePoolAddress, drawId)}`;
}

export function drawPath(chainId: string, prizePoolAddress: string, drawId: string): string {
  return `${chainId}/${prizePoolAddress.toLowerCase()}/draw/${drawId}/`;
}
