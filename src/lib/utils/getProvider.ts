import { JsonRpcProvider } from "@ethersproject/providers";

export const getProvider = (): JsonRpcProvider => {
  if (!process.env.JSON_RPC_URL) {
    throw new Error(
      `No provider available - likely missing 'process.env.JSON_RPC_URL', see README about proper installation`
    );
  }

  return new JsonRpcProvider(process.env.JSON_RPC_URL);
};
