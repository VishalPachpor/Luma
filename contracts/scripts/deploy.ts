/**
 * Deploy EventEscrow to Sepolia
 * 
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network sepolia
 * 
 * Prerequisites:
 *   1. Set SEPOLIA_RPC_URL in .env (e.g., Alchemy/Infura)
 *   2. Set DEPLOYER_PRIVATE_KEY in .env (account with Sepolia ETH)
 *   3. Run: npm install
 *   4. Run: npm run deploy:sepolia
 */

import { ethers } from "hardhat";

async function main() {
    console.log("Deploying EventEscrow to Sepolia...\n");

    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");

    // Deploy contract
    const EventEscrow = await ethers.getContractFactory("EventEscrow");
    const escrow = await EventEscrow.deploy();

    await escrow.waitForDeployment();
    const address = await escrow.getAddress();

    console.log("✅ EventEscrow deployed to:", address);
    console.log("\nVerify on Etherscan:");
    console.log(`npx hardhat verify --network sepolia ${address}`);

    // Save address for frontend
    console.log("\n📋 Add to your .env.local:");
    console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
