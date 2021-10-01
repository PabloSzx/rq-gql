import { gql } from "../generated";
import { useGQLQuery } from "../rq";

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
