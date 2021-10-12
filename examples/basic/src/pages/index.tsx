import { useGQLQuery } from "rq-gql";
import { gql } from "../generated";

export default function IndexPage() {
  const { isLoading, data } = useGQLQuery(
    gql(/* GraphQL */ `
      query hello {
        hello
      }
    `)
  );

  return <p>{isLoading ? "..." : data?.hello}</p>;
}
