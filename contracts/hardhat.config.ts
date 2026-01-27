import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Load environment variables (add to .env)
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/demo";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {
            chainId: 31337
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000000"
                ? [PRIVATE_KEY]
                : [],
            chainId: 11155111
        },
        // Future mainnet config
        mainnet: {
            url: process.env.MAINNET_RPC_URL || "",
            accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000000"
                ? [PRIVATE_KEY]
                : [],
            chainId: 1
        }
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};

export default config;
