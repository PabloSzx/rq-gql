import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
import { ExecutionResult, print } from "graphql";
import {
  QueryKey,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "react-query";
import { proxy, useSnapshot } from "valtio";

export function RQGql({
  documents,
}: {
  documents: Record<string, DocumentNode>;
}) {
  const documentsMap = new WeakMap<DocumentNode, string>();

  for (const [docString, doc] of Object.entries(documents)) {
    documentsMap.set(doc, docString);
  }

  let endpoint = "/graphql";

  let fetchOptions: Partial<RequestInit> = {};

  function configureRQ(options: {
    fetchOptions?: Partial<RequestInit>;
    endpoint?: string;
  }) {
    if (options.fetchOptions) fetchOptions = options.fetchOptions;
    if (endpoint) endpoint = endpoint;
  }

  function useGQLQuery<
    TData = Record<string, any>,
    TVariables = Record<string, any>
  >(
    queryDoc: DocumentNode<TData, TVariables> | string,
    variables?: TVariables,
    options?: Omit<
      UseQueryOptions<TData, Error, TData, QueryKey>,
      "queryKey" | "queryFn"
    >
  ): UseQueryResult<TData, Error> {
    const key = getQueryString(queryDoc);
    return useQuery(
      variables === undefined ? [key, variables] : key,
      fetcher(queryDoc, variables),
      options
    );
  }

  function getQueryString(doc: DocumentNode | string) {
    let key = typeof doc === "string" ? doc : documentsMap.get(doc);

    if (key == null) {
      if (typeof doc !== "string") {
        key = typeof doc === "string" ? doc : print(doc);
        documentsMap.set(doc, key);
      } else {
        key = doc;
      }
    }

    return key;
  }

  const headers = proxy<Record<string, string>>({
    "content-type": "application/json",
  });

  const useHeadersSnapshot = () => useSnapshot(headers);

  function fetcher<TData, TVariables>(
    queryDoc: DocumentNode<TData, TVariables> | string,
    variables?: TVariables
  ) {
    return async (): Promise<TData> => {
      const query = getQueryString(queryDoc);
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
        ...fetchOptions,
      });

      const { errors, data }: ExecutionResult<TData> = await res.json();

      if (errors?.length) {
        if (errors.length > 1) {
          const err = Error("Multiple Errors");

          for (const err of errors) {
            console.error(err);
          }
          Object.assign(err, {
            graphqlErrors: errors,
          });

          throw err;
        }

        const { message } = errors[0]!;

        throw new Error(message);
      }

      return data!;
    };
  }

  return {
    useGQLQuery,
    headers,
    fetcher,
    useHeadersSnapshot,
    configureRQ,
  };
}
