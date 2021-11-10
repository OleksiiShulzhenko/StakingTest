require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();
require("hardhat-gas-reporter");

const {PRIVATE_KEY, ETHERSCAN_API_KEY} = process.env;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
        version: "0.8.4", settings: {
            optimizer: {
                enabled: true, runs: 200
            }
        }
    }, gas: "auto", gasReporter: {
    gasPrice: 1, enabled: false, showTimeSpent: true
    }
};