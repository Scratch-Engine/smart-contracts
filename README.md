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
npx hardhat accounts --network rinkeby
```
In the above example, rinkeby corresponds with one of the Ethereum **Testnet**.

> If you don't specify a network it will default to the `hardhat` network.

#### Dotenv file

Create a `.env` file on the root directory with the following parameters:
```
# 3rd parties
ETHERSCAN_API_KEY=your_api_key
COINMARKETCAP_API_KEY=your_api_key
# Rinkeby
ALCHEMY_ETH_RINKEBY_URL=your_url
RINKEBY_PRIVATE_KEY=your_private_key
# Ropsten
ALCHEMY_ETH_ROPSTEN_URL=your_url
ROPSTEN_PRIVATE_KEY=your_private_key
# Mainnet
ALCHEMY_ETH_MAINNET_URL=your_url
ETHEREUM_PRIVATE_KEY=your_private_key
# Config
REPORT_GAS=false
FORK_MAINNET=true
FORK_BLOCK_NUMBER=14101344
OPTIMIZER_ENABLED=false # Set to true when deploying
```

### Facuets

**Rinkeby** ETH:
- https://faucets.chain.link/rinkeby
- https://www.rinkebyfaucet.com/

You can also get some Ropsten Eth from:
- https://moonborrow.com/
- https://ropsten.oregonctf.org/eth
- https://faucet.ropsten.be/
- https://faucet.dimensions.network/
- https://faucet.egorfine.com/

## Testing

Execute all the tests by running `npx hardhat test`.

> If you want to run a specific test, simply add `.only` to it in the code file. For example `it.only("Some test")`.

### Codecoverage

View the code coverage report with `npx hardhat coverage`.

### Gast costs

View the gas costs in ETH and USD when running `npx hardhat test`.
Needs to be enabled in the `.env` file with `REPORT_GAS=true`.

### Contract Size

View the contract sizes by running `npx hardhat size-contracts`.

### Other tools

- **Flatten**: Create a single solidity file with all the created and imported contracts with `npx hardhat flatten > Output.sol`.
- **Solhint**: The project includes the Solhint linter. You can also run it manually with `npx solhint **/*.sol`. To remove acknoledge warnings use `// solhint-disable-next-line` or `// // solhint-disable-line`.
- **Mythril**: A CLI security analysis tool to detect security vulneratilibities. Can be run on the flattened smart contract with `myth analyze Output.sol`. View complete instructions at [https://github.com/ConsenSys/mythril](https://github.com/ConsenSys/mythril)

## Deployment

Deploy the contracts with the [deploy](scripts/deploy.js) script and specificy the network you want to use, either testnet `rinkeby` or mainnet `ethereum`.

Perform the following cleanup steps before deployment:
- Remove `console.log` references and the **import** from *all* the contracts.
- Set `OPTIMIZER_ENABLED` to `true` on the `.env` file.
- Ensure that all wallet addresses inside the `deploy.js` script are correct.

```shell
npx hardhat run scripts/deploy.js --network rinkeby
```

> After deployment is done, write down the UniswapV2 pair address to create the Liquidity Pool and save the different addresses for the contracts deployed.

### Etherscan verification

Optionally you can verify the smart contract on Etherscan.

Uncomment the calls to the `verifyTokenOnEtherscan` and `verifyTimelockOnEtherscan` methods on the [deploy](scripts/deploy.js) script to perform the verification.
Otherwise you can also call those methods separately with the deployed addresses as parameters.
