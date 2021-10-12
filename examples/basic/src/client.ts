import { QueryClient } from "react-query";
import { RQGQLClient } from "rq-gql";

export const client = new QueryClient();

export const rqGQLClient = new RQGQLClient({
  endpoint: "https://learner-model.pablosz.dev/graphql",
});
