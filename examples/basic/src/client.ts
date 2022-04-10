import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from "react-query";
import { RQGQLClient } from "rq-gql";

export const client = new QueryClient();

export const rqGQLClient = new RQGQLClient({
  endpoint: "https://lm.inf.uach.cl/graphql",
  QueryClientProvider,
  useQuery,
  useInfiniteQuery,
  useMutation,
});
