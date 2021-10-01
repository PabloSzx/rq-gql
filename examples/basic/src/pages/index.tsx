import { gql } from "../generated";
import { useGraphQLQuery } from "../rq";

export default function IndexPage() {
  const { isLoading, data } = useGraphQLQuery(
    gql(/* GraphQL */ `
      query hello {
        hello
      }
    `)
  );

  return <p>{isLoading ? "..." : data?.hello}</p>;
}
