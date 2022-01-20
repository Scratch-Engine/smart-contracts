# Scratch Token Contracts

This project contains the Smart Contracts for the Scratch Engine Token.

## Get Started

### Running the project
1. Clone the project.
2. Run `npm install` to get all the dependencies.

### Network Environments

The [hardhat.config](hardhat.config.js) file contains the list of networks supported by this project.
When running tasks from the command line, specify which network you want to connect to by appending the flag `--network name`, for example:

```shell
npx hardhat accounts --network ropsten
```
In the above example, ropsten corresponds with the Ethereum **Testnet**.

### Facuets

You can get some Ropsten Eth from:
- https://faucet.ropsten.be/
- https://faucet.egorfine.com/

## Testing

Execute all the tests by running `npx hardhat test`.

> If you want to run a specific test, simply add `.only` to it in the code file. For example `it.only("Some test").

## Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.js
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```
