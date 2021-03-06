const H20 = require("./artifacts/h20.json");
const BUSD = require("./artifacts/BUSDImplementation.json");
const SEED = require("./artifacts/seed_abi.json");

export const TOKENS = {
  H20: {
    artifacts: H20,
  },
  BUSD: {
    artifacts: BUSD,
  },
  SEED: {
    artifacts: SEED,
  },
};

export const VALIDTOKENS = {
  Mainnet: ["H20", "SEED"],
  Pangaea: [],
  Testnet: ["H20", "BUSD"],
  Localnet: [],
  OpenStakingNet: [],
  PartnerNet: [],
};
