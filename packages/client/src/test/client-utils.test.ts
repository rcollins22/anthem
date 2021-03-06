import { ICosmosValidator, NETWORKS } from "@anthem/utils";
import { ApolloError } from "apollo-client";
import {
  abbreviateAddress,
  canRenderGraphQL,
  capitalizeString,
  formatAddressString,
  formatCommissionRate,
  getAccountBalances,
  getBlockExplorerUrlForTransaction,
  getFiatPriceHistoryMap,
  getPercentageFromTotal,
  getPortfolioTypeFromUrl,
  getQueryParamsFromUrl,
  getValidatorNameFromAddress,
  getValidatorOperatorAddressMap,
  identity,
  isGraphQLResponseDataEmpty,
  mapRewardsToAvailableRewards,
  onActiveRoute,
  onPath,
  race,
  sortValidatorsChorusOnTop,
  trimZeroes,
  wait,
} from "tools/client-utils";
import { cosmosRewardsByValidator } from "../../../utils/src/client/data/cosmosRewardsByValidator.json";
import { cosmosValidators } from "../../../utils/src/client/data/cosmosValidators.json";
import { fiatPriceHistory } from "../../../utils/src/client/data/fiatPriceHistory.json";

describe("utils", () => {
  test("abbreviateAddress", () => {
    expect(
      abbreviateAddress("cosmos15urq2dtp9qce4fyc85m6upwm9xul3049um7trd"),
    ).toMatchInlineSnapshot(`"cosmos15...49um7trd"`);

    expect(
      abbreviateAddress("cosmos15urq2dtp9qce4fyc85m6upwm9xul3049um7trd", 5),
    ).toMatchInlineSnapshot(`"cosmos15...m7trd"`);

    expect(
      abbreviateAddress("cosmos15urq2dtp9qce4fyc85m6upwm9xul3049um7trd", 7),
    ).toMatchInlineSnapshot(`"cosmos15...9um7trd"`);
  });

  test("capitalizeString", () => {
    expect(capitalizeString("APPLES")).toBe("Apples");
    expect(capitalizeString("Banana")).toBe("Banana");
    expect(capitalizeString("oranGES")).toBe("Oranges");
    expect(capitalizeString("pEACHES")).toBe("Peaches");
    expect(capitalizeString("apples AND BANANAS")).toBe("Apples and bananas");
  });

  test("formatValidatorsList", () => {
    const result = sortValidatorsChorusOnTop<ICosmosValidator>(
      cosmosValidators,
      v => v.description.moniker,
    );
    expect(result[0].description.moniker).toBe("Chorus One");
  });

  test("getBlockExplorerUrlForTransaction", () => {
    let result = getBlockExplorerUrlForTransaction(
      "5C8E06175EE62495A4A2DE82AA0AD8F5E0E11EFC825A7673C1638966E97ABCA0",
      "COSMOS",
    );
    expect(result).toMatchInlineSnapshot(
      `"https://www.mintscan.io/txs/5C8E06175EE62495A4A2DE82AA0AD8F5E0E11EFC825A7673C1638966E97ABCA0"`,
    );

    result = getBlockExplorerUrlForTransaction(
      "5C8E06175EE62495A4A2DE82AA0AD8F5E0E11EFC825A7673C1638966E97ABCA0",
      "KAVA",
    );
    expect(result).toMatchInlineSnapshot(
      `"https://kava.mintscan.io/txs/5C8E06175EE62495A4A2DE82AA0AD8F5E0E11EFC825A7673C1638966E97ABCA0"`,
    );

    result = getBlockExplorerUrlForTransaction(
      "5C8E06175EE62495A4A2DE82AA0AD8F5E0E11EFC825A7673C1638966E97ABCA0",
      "TERRA",
    );
    expect(result).toMatchInlineSnapshot(
      `"https://terra.stake.id/?#/tx/5C8E06175EE62495A4A2DE82AA0AD8F5E0E11EFC825A7673C1638966E97ABCA0"`,
    );
  });

  test("getFiatPriceHistoryMap", () => {
    const result = getFiatPriceHistoryMap(fiatPriceHistory);
    for (const price of Object.values(result)) {
      expect(typeof price).toBe("number");
    }
  });

  test("getValidatorOperatorAddressMap", () => {
    const result = getValidatorOperatorAddressMap<ICosmosValidator>(
      cosmosValidators,
      v => v.operator_address,
    );
    for (const [key, value] of Object.entries(result)) {
      expect(key).toBe(value.operator_address);
    }
  });

  test("getValidatorNameFromAddress", () => {
    const validatorMap = getValidatorOperatorAddressMap<ICosmosValidator>(
      cosmosValidators,
      v => v.operator_address.toUpperCase(),
    );
    const result = getValidatorNameFromAddress(
      validatorMap,
      "cosmos15urq2dtp9qce4fyc85m6upwm9xul3049um7trd",
      "COSMOS",
    );

    // @ts-ignore
    expect(result.description.moniker).toBe("Chorus One");
  });

  test("isGraphQLResponseDataEmpty", () => {
    expect(isGraphQLResponseDataEmpty()).toBeTruthy();
    expect(isGraphQLResponseDataEmpty(undefined)).toBeTruthy();
    expect(isGraphQLResponseDataEmpty({})).toBeTruthy();
    expect(isGraphQLResponseDataEmpty({ data: {} })).toBeFalsy();
  });

  test("mapRewardsToAvailableRewards", () => {
    const result = mapRewardsToAvailableRewards(
      cosmosRewardsByValidator,
      NETWORKS.COSMOS,
    );
    for (const reward of result) {
      expect(+reward.amount > 1).toBeTruthy();
    }
  });

  test("onPath", () => {
    expect(
      onPath("https://anthem.chorus.one/dashboard/rewards", "rewards"),
    ).toBeTruthy();

    expect(
      onPath("https://anthem.chorus.one/dashboard/rewards", "staking"),
    ).toBeFalsy();
  });

  test("onActiveRoute matches routes correctly", () => {
    expect(
      onActiveRoute("/cosmos/dashboard", "/cosmos/dashboard"),
    ).toBeTruthy();
    expect(onActiveRoute("/cosmos/wallet", "/cosmos/wallet")).toBeTruthy();
    expect(
      onActiveRoute("/cosmos/governance", "/cosmos/governance"),
    ).toBeTruthy();

    expect(onActiveRoute("/cosmos/wallet", "wallet")).toBeFalsy();
    expect(onActiveRoute("/cosmos/settings", "settings")).toBeFalsy();
    expect(onActiveRoute("/cosmos/help", "help")).toBeFalsy();
  });

  test("getQueryParamsFromUrl", () => {
    const address = "90as7fd890a7fd90";
    const network = "kava";

    let result = getQueryParamsFromUrl(`?address=${address}`);
    expect(result).toEqual({
      address,
    });

    result = getQueryParamsFromUrl(`?address=${address}&network=${network}`);
    expect(result).toEqual({
      address,
      network,
    });
  });

  test("identity", () => {
    expect(identity(true)).toBe(true);
    expect(identity(false)).toBe(false);
    expect(identity("hello")).toBe("hello");
    expect(identity([1, 2, 3])).toEqual([1, 2, 3]);
  });

  test("getAccountBalances", () => {
    const result = getAccountBalances(
      {
        balance: [{ denom: "uatom", amount: "10437483575" }],
        rewards: [
          { denom: "uatom", amount: "43885834.430233950285662958" },
          { denom: "uatom", amount: "55210.393536427332000000" },
        ],
        delegations: [
          {
            delegator_address: "cosmos15urq2dtp9qce4fyc85m6upwm9xul3049um7trd",
            validator_address:
              "cosmosvaloper15urq2dtp9qce4fyc85m6upwm9xul3049e02707",
            shares: "4998999999.000000000000000000",
          },
          {
            delegator_address: "cosmos15urq2dtp9qce4fyc85m6upwm9xul3049um7trd",
            validator_address:
              "cosmosvaloper14lultfckehtszvzw4ehu0apvsr77afvyju5zzy",
            shares: "1000000.000000000000000000",
          },
        ],
        unbonding: [],
        commissions: [
          { denom: "uatom", amount: "3948657657.935688218355926858" },
        ],
      },
      100.52,
      NETWORKS.COSMOS,
      NETWORKS.COSMOS.denom,
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "balance": "10,437.48",
        "balanceFiat": "1,049,175.85",
        "commissions": "3,948.66",
        "commissionsFiat": "396,919.07",
        "delegations": "5,000.00",
        "delegationsFiat": "502,600.00",
        "percentages": Array [
          53.71816457763739,
          25.733292982400577,
          0.2261495561258058,
          0,
          20.322392883836226,
        ],
        "rewards": "43.94",
        "rewardsFiat": "4,416.95",
        "total": "19,430.08",
        "totalFiat": "1,953,111.87",
        "unbonding": "0",
        "unbondingFiat": "0",
      }
    `);
  });

  test("canRender", () => {
    // @ts-ignore
    const error: ApolloError = {};

    let result = canRenderGraphQL({ loading: false, data: {} });
    expect(result).toBeTruthy();

    result = canRenderGraphQL({ loading: false, error });
    expect(result).toBeFalsy();

    result = canRenderGraphQL({ loading: true });
    expect(result).toBeFalsy();
  });

  test("getPortfolioTypeFromUrl", () => {
    let result = getPortfolioTypeFromUrl("dashboard/available");
    expect(result).toBe("AVAILABLE");

    result = getPortfolioTypeFromUrl("dashboard/rewards");
    expect(result).toBe("REWARDS");

    result = getPortfolioTypeFromUrl("dashboard/settings");
    expect(result).toBe(null);
  });

  test("trimZeroes", () => {
    let result = trimZeroes("0.0007560000");
    expect(result).toBe("0.000756");

    result = trimZeroes("0.00075600900");
    expect(result).toBe("0.000756009");

    result = trimZeroes("0.0407560000");
    expect(result).toBe("0.040756");

    result = trimZeroes("0.00075600001");
    expect(result).toBe("0.00075600001");
  });

  test("formatAddressString", () => {
    const address = "cosmos1yeygh0y8rfyufdczhzytcl3pehsnxv9d3wsnlg";
    let result = formatAddressString(address, false);
    expect(result).toMatchInlineSnapshot(
      `"cosmos1yeygh0y8rfyufdczhzytcl3pehsnxv9d3wsnlg"`,
    );

    result = formatAddressString(address, true);
    expect(result).toMatchInlineSnapshot(`"cosmos1y...9d3wsnlg"`);

    result = formatAddressString(address, true, 6);
    expect(result).toMatchInlineSnapshot(`"cosmos1y...3wsnlg"`);

    result = formatAddressString(address, false, 12);
    expect(result).toMatchInlineSnapshot(
      `"cosmos1yeygh0y8rfyufdczhzytcl3pehsnxv9d3wsnlg"`,
    );
  });

  test("abbreviateAddress", () => {
    const address = "cosmos1yeygh0y8rfyufdczhzytcl3pehsnxv9d3wsnlg";
    let result = abbreviateAddress(address);
    expect(result).toMatchInlineSnapshot(`"cosmos1y...9d3wsnlg"`);

    result = abbreviateAddress(address, 10);
    expect(result).toMatchInlineSnapshot(`"cosmos1y...xv9d3wsnlg"`);
  });

  test("race", async () => {
    try {
      await race<any>(
        async () =>
          new Promise(resolve => setTimeout(() => resolve(null), 5000)),
      );
    } catch (error) {
      expect(error).toBe("race timeout occurred");
    }

    expect(
      await race<any>(
        async () => new Promise(resolve => setTimeout(() => resolve(null), 50)),
      ),
    ).toBe(null);
  });

  test("wait", async () => {
    const then = Date.now();
    await wait(500);
    const expected = then + 500;
    expect(Date.now() - expected < 10).toBeTruthy();
  });

  test("formatCommissionRate", () => {
    expect(formatCommissionRate("0.0025000000")).toBe("0.25");
    expect(formatCommissionRate("0.00750")).toBe("0.75");
    expect(formatCommissionRate("0.08")).toBe("8.00");
    expect(formatCommissionRate("0.075000000000")).toBe("7.50");
    expect(formatCommissionRate("0.075250000000")).toBe("7.53");
  });

  test("formatVotingPower", () => {
    const total = "184117466747846";
    expect(getPercentageFromTotal("74843655191", total)).toMatchInlineSnapshot(
      `"0.04"`,
    );
    expect(
      getPercentageFromTotal("5601876912537", total),
    ).toMatchInlineSnapshot(`"3.04"`);
    expect(
      getPercentageFromTotal("1604729095336", total),
    ).toMatchInlineSnapshot(`"0.87"`);
    expect(getPercentageFromTotal("67605300547", total)).toMatchInlineSnapshot(
      `"0.04"`,
    );
    expect(getPercentageFromTotal("252362566166", total)).toMatchInlineSnapshot(
      `"0.14"`,
    );
  });

  // TODO: Perform assertions...
  // const result = adaptRawTransactionData(
  //   MOCK_BLOCKCHAIN_TRANSACTION_RESULT,
  //   "cosmoshub-3",
  // );
  test.todo("adaptRawTransactionData");
});
