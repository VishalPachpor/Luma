import { ethers } from "hardhat";

async function main() {
    console.log("Deploying EventEscrow to Sepolia...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");

    const EventEscrow = await ethers.getContractFactory("EventEscrow");
    const escrow = await EventEscrow.deploy();

    await escrow.waitForDeployment();

    await new Promise(resolve => setTimeout(resolve, 5000));

    const address = await escrow.getAddress();

    console.log("✅ EventEscrow deployed to:", address);
    console.log("\nVerify on Etherscan:");
    console.log(`npx hardhat verify --network sepolia ${address}`);

    console.log("\n📋 Add to your .env.local:");
    console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
