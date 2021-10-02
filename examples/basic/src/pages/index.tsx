import { gql, useGQLQuery } from "../generated";

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
