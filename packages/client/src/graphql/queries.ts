import {
  CeloAccountBalancesDocument,
  CeloAccountHistoryDocument,
  CeloTransactionDocument,
  CeloTransactionsDocument,
  CeloValidatorGroupsDocument,
  CosmosAccountBalancesDocument,
  CosmosAccountHistoryDocument,
  CosmosAccountInformationDocument,
  CosmosRewardsByValidatorDocument,
  CosmosStakingPoolDocument,
  CosmosTransactionsDocument,
  CosmosValidatorsDocument,
  DailyPercentChangeDocument,
  FiatCurrenciesDocument,
  FiatPriceHistoryDocument,
  IQuery,
  OasisAccountBalancesDocument,
  OasisAccountHistoryDocument,
  OasisTransactionsDocument,
  PricesDocument,
} from "@anthem/utils";
import ENV from "lib/client-env";
import { ReduxStoreState } from "modules/root";
import { graphql, QueryOpts, QueryResult } from "react-apollo";
import { connect } from "react-redux";
import { createSelector } from "reselect";

/** ===========================================================================
 * Query Providers
 * ----------------------------------------------------------------------------
 * These are helpers to make it easy to fetch data from GraphQL APIs and
 * provide the response data components.
 * ============================================================================
 */

const addressSelector = (state: ReduxStoreState) => state.ledger.ledger.address;
const networkSelector = (state: ReduxStoreState) => state.ledger.ledger.network;
const transactionsPageSelectors = (state: ReduxStoreState) =>
  state.transaction.transactionsPage;
const fiatSelector = (state: ReduxStoreState) =>
  state.settings.fiatCurrency.symbol;

export const graphqlSelector = createSelector(
  [addressSelector, networkSelector, fiatSelector, transactionsPageSelectors],
  (address, network, fiat, startingPage) => {
    return {
      fiat,
      address,
      versus: fiat,
      startingPage,
      network: network.name,
      networkDefinition: network,
      currency: network.cryptoCompareTicker,
    };
  },
);

const mapGraphQLVariablesToProps = (state: ReduxStoreState) => ({
  graphql: graphqlSelector(state),
});

export type GraphQLConfigProps = ReturnType<typeof mapGraphQLVariablesToProps>;

export const withGraphQLVariables = connect(mapGraphQLVariablesToProps);

const getQueryConfig = (pollInterval: number | undefined) => (
  variableKeys?: ReadonlyArray<VariablesKeys>,
) => ({
  options: (props: GraphQLConfigProps): QueryOpts => {
    const variables: { [k: string]: string | number } = {};

    if (variableKeys) {
      for (const key of variableKeys) {
        variables[key] = props.graphql[key];
      }
    }

    return {
      variables,
      pollInterval,
    };
  },
  skip: (props: GraphQLConfigProps) => {
    return props.graphql.address === "";
  },
});

type VariablesKeys =
  | "address"
  | "fiat"
  | "currency"
  | "versus"
  | "network"
  | "startingPage";

const slowPollingConfig = (variableKeys: ReadonlyArray<VariablesKeys>) => {
  return getQueryConfig(ENV.SLOW_POLL_INTERVAL)(variableKeys);
};

const fastPollingConfig = (variableKeys: ReadonlyArray<VariablesKeys>) => {
  return getQueryConfig(ENV.FAST_POLL_INTERVAL)(variableKeys);
};

const noPollingConfig = (variableKeys?: ReadonlyArray<VariablesKeys>) => {
  return getQueryConfig(undefined)(variableKeys);
};

/** ===========================================================================
 * Account Balances
 * ============================================================================
 */

interface AccountBalancesQueryResult extends QueryResult {
  data: void;
  cosmosAccountBalances: IQuery["cosmosAccountBalances"];
}

export interface CosmosAccountBalancesProps {
  cosmosAccountBalances: AccountBalancesQueryResult;
}

export const withCosmosAccountBalances = graphql(
  CosmosAccountBalancesDocument,
  {
    name: "cosmosAccountBalances",
    ...fastPollingConfig(["address"]),
  },
);

/** ===========================================================================
 * AtomPriceData
 * ============================================================================
 */

interface FiatPriceDataQueryResult extends QueryResult {
  data: void;
  prices: IQuery["prices"];
}

export interface FiatPriceDataProps {
  prices: FiatPriceDataQueryResult;
}

export const withFiatPriceData = graphql(PricesDocument, {
  name: "prices",
  ...fastPollingConfig(["versus", "currency"]),
});

/** ===========================================================================
 * DailyPercentageChange
 * ============================================================================
 */

interface DailyPercentChangeQueryResult extends QueryResult {
  data: void;
  dailyPercentChange: IQuery["dailyPercentChange"];
}

export interface DailyPercentChangeProps {
  dailyPercentChange: DailyPercentChangeQueryResult;
}

export const withDailyPercentChange = graphql(DailyPercentChangeDocument, {
  name: "dailyPercentChange",
  ...fastPollingConfig(["currency", "fiat"]),
});

/** ===========================================================================
 * RewardsByValidator
 * ============================================================================
 */

interface RewardsByValidatorQueryResult extends QueryResult {
  data: void;
  rewardsByValidator: IQuery["cosmosRewardsByValidator"];
}

export interface RewardsByValidatorProps {
  rewardsByValidator: RewardsByValidatorQueryResult;
}

export const withRewardsByValidatorQuery = graphql(
  CosmosRewardsByValidatorDocument,
  {
    name: "rewardsByValidator",
    ...slowPollingConfig(["address"]),
  },
);

/** ===========================================================================
 * Portfolio History
 * ============================================================================
 */

export interface CosmosAccountHistoryQueryResult extends QueryResult {
  data: void;
  cosmosAccountHistory: IQuery["cosmosAccountHistory"];
}

export interface CosmosAccountHistoryProps {
  cosmosAccountHistory: CosmosAccountHistoryQueryResult;
}

export const withCosmosAccountHistory = graphql(CosmosAccountHistoryDocument, {
  name: "cosmosAccountHistory",
  ...slowPollingConfig(["address", "fiat"]),
});

/** ===========================================================================
 * FiatPriceHistory
 * ============================================================================
 */

interface FiatPriceHistoryQueryResult extends QueryResult {
  data: void;
  fiatPriceHistory: IQuery["fiatPriceHistory"];
}

export interface FiatPriceHistoryProps {
  fiatPriceHistory: FiatPriceHistoryQueryResult;
}

export const withFiatPriceHistory = graphql(FiatPriceHistoryDocument, {
  name: "fiatPriceHistory",
  ...noPollingConfig(["fiat", "network"]),
});

/** ===========================================================================
 * FiatCurrencies
 * ============================================================================
 */

interface FiatCurrenciesQueryResult extends QueryResult {
  data: void;
  fiatCurrencies: IQuery["fiatCurrencies"];
}

export interface FiatCurrenciesProps {
  fiatCurrencies: FiatCurrenciesQueryResult;
}

export const withFiatCurrencies = graphql(FiatCurrenciesDocument, {
  name: "fiatCurrencies",
  ...noPollingConfig(),
});

/** ===========================================================================
 * AccountInformation
 * ============================================================================
 */

interface AccountInformationQueryResult extends QueryResult {
  data: void;
  accountInformation: IQuery["cosmosAccountInformation"];
}

export interface AccountInformationProps {
  accountInformation: AccountInformationQueryResult;
}

export const withAccountInformation = graphql(
  CosmosAccountInformationDocument,
  {
    name: "accountInformation",
    ...slowPollingConfig(["address"]),
  },
);

/** ===========================================================================
 * Cosmos Transactions
 * ============================================================================
 */

interface CosmosTransactionsQueryResult extends QueryResult {
  data: void;
  cosmosTransactions: IQuery["cosmosTransactions"];
}

export interface CosmosTransactionsProps {
  transactions: CosmosTransactionsQueryResult;
}

export const withCosmosTransactions = graphql(CosmosTransactionsDocument, {
  name: "transactions",
  ...noPollingConfig(["address", "startingPage"]),
});

/** ===========================================================================
 * Validators
 * ============================================================================
 */

interface ValidatorsQueryResult extends QueryResult {
  data: void;
  cosmosValidators: IQuery["cosmosValidators"];
}

export interface ValidatorsProps {
  cosmosValidators: ValidatorsQueryResult;
}

export const withValidators = graphql(CosmosValidatorsDocument, {
  name: "cosmosValidators",
  ...noPollingConfig(["network"]),
});

/** ===========================================================================
 * Staking Pool
 * ============================================================================
 */

interface StakingPoolQueryResult extends QueryResult {
  data: void;
  stakingPool: IQuery["cosmosStakingPool"];
}

export interface StakingPoolProps {
  stakingPool: StakingPoolQueryResult;
}

export const withStakingPool = graphql(CosmosStakingPoolDocument, {
  name: "stakingPool",
  ...noPollingConfig(["network"]),
});

/** ===========================================================================
 * Account Balances
 * ============================================================================
 */

interface OasisAccountBalancesQueryResult extends QueryResult {
  data: void;
  oasisAccountBalances: IQuery["oasisAccountBalances"];
}

export interface OasisAccountBalancesProps {
  oasisAccountBalances: OasisAccountBalancesQueryResult;
}

export const withOasisAccountBalances = graphql(OasisAccountBalancesDocument, {
  name: "oasisAccountBalances",
  ...fastPollingConfig(["address"]),
});

/** ===========================================================================
 * Oasis Account History
 * ============================================================================
 */

interface OasisAccountHistoryQueryResult extends QueryResult {
  data: void;
  oasisAccountHistory: IQuery["oasisAccountHistory"];
}

export interface OasisAccountHistoryProps {
  oasisAccountHistory: OasisAccountHistoryQueryResult;
}

export const withOasisAccountHistory = graphql(OasisAccountHistoryDocument, {
  name: "oasisAccountHistory",
  ...noPollingConfig(["address", "fiat"]),
});

/** ===========================================================================
 * Oasis Transactions
 * ============================================================================
 */

interface OasisTransactionsQueryResult extends QueryResult {
  data: void;
  oasisTransactions: IQuery["oasisTransactions"];
}

export interface OasisTransactionsProps {
  transactions: OasisTransactionsQueryResult;
}

export const withOasisTransactions = graphql(OasisTransactionsDocument, {
  name: "transactions",
  ...noPollingConfig(["address", "startingPage"]),
});

/** ===========================================================================
 * Account Balances
 * ============================================================================
 */

interface CeloAccountBalancesQueryResult extends QueryResult {
  data: void;
  celoAccountBalances: IQuery["celoAccountBalances"];
}

export interface CeloAccountBalancesProps {
  celoAccountBalances: CeloAccountBalancesQueryResult;
}

export const withCeloAccountBalances = graphql(CeloAccountBalancesDocument, {
  name: "celoAccountBalances",
  ...fastPollingConfig(["address"]),
});

/** ===========================================================================
 * Celo Account History
 * ============================================================================
 */

interface CeloAccountHistoryQueryResult extends QueryResult {
  data: void;
  celoAccountHistory: IQuery["celoAccountHistory"];
}

export interface CeloAccountHistoryProps {
  celoAccountHistory: CeloAccountHistoryQueryResult;
}

export const withCeloAccountHistory = graphql(CeloAccountHistoryDocument, {
  name: "celoAccountHistory",
  ...noPollingConfig(["address", "fiat"]),
});

/** ===========================================================================
 * Celo Transactions
 * ============================================================================
 */

interface CeloTransactionsQueryResult extends QueryResult {
  data: void;
  celoTransactions: IQuery["celoTransactions"];
}

export interface CeloTransactionsProps {
  transactions: CeloTransactionsQueryResult;
}

export const withCeloTransactions = graphql(CeloTransactionsDocument, {
  name: "transactions",
  ...noPollingConfig(["address", "startingPage"]),
});

/** ===========================================================================
 * Celo Transaction
 * ============================================================================
 */

interface CeloTransactionQueryResult extends QueryResult {
  data: void;
  celoTransaction: IQuery["celoTransaction"];
}

export interface CeloTransactionProps {
  transactions: CeloTransactionQueryResult;
}

export const withCeloTransaction = graphql(CeloTransactionDocument, {
  name: "transaction",
  ...noPollingConfig(["address", "startingPage"]),
});

/** ===========================================================================
 * Celo Validators
 * ============================================================================
 */

interface CeloValidatorsQueryResult extends QueryResult {
  data: void;
  celoValidatorGroups: IQuery["celoValidatorGroups"];
}

export interface CeloValidatorsProps {
  celoValidatorGroups: CeloValidatorsQueryResult;
}

export const withCeloValidatorGroups = graphql(CeloValidatorGroupsDocument, {
  name: "celoValidatorGroups",
  ...noPollingConfig(["address", "fiat"]),
});
