export const HASURA_CONFIG = {
  HASURA_GRAPHQL_ENDPOINT: process.env.HASURA_GRAPHQL_ENDPOINT || 'http://hasura:8080/v1/graphql',
  HASURA_GRAPHQL_ADMIN_SECRET: process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'myadminsecretkey',
  HASURA_ACTIONS_SECRET: process.env.HASURA_ACTIONS_SECRET || 'myactionssecret'
};
