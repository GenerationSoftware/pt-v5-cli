import { JsonRpcProvider } from "@ethersproject/providers";

type Providers = { [k: string]: JsonRpcProvider };

// eg.
// https://mainnet.infura.io/v3/<YOUR-API-KEY>
const providers: Providers = {
  // mainnets
  1: new JsonRpcProvider(process.env.ETHEREUM_MAINNET_RPC_URL),
  10: new JsonRpcProvider(process.env.OPTIMISM_MAINNET_RPC_URL),
  8453: new JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL),
  42161: new JsonRpcProvider(process.env.ARBITRUM_MAINNET_RPC_URL),
  // testnets
  84532: new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL),
  421614: new JsonRpcProvider(process.env.ARBITRUM_SEPOLIA_RPC_URL),
  11155111: new JsonRpcProvider(process.env.SEPOLIA_RPC_URL),
  11155420: new JsonRpcProvider(process.env.OPTIMISM_SEPOLIA_RPC_URL),
};

export const getProvider = (chainId: string): JsonRpcProvider => {
  const provider = providers[chainId];

  if (!provider) {
    throw new Error(`No provider for chainId ${chainId}`);
  }

  return provider;
};
