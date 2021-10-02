import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
import { ExecutionResult, print } from "graphql";
import {
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  useMutation,
  UseMutationOptions,
  UseMutationResult,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "react-query";
import { proxy, useSnapshot } from "valtio";

export function rqGQL<Documents extends Record<string, DocumentNode>>({
  documents,
}: {
  documents: Documents;
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
    return useQuery(
      getKey(queryDoc, variables),
      fetchGQL(queryDoc, variables),
      options
    );
  }

  function useGQLMutation<
    TData = Record<string, any>,
    TVariables = Record<string, any>
  >(
    queryDoc: DocumentNode<TData, TVariables> | string,
    variables?: TVariables,
    options?: Omit<
      UseMutationOptions<TData, Error, TVariables, any>,
      "queryKey" | "queryFn"
    >
  ): UseMutationResult<TData, Error, TVariables> {
    return useMutation<TData, Error, TVariables>(
      (variablesArg: TVariables | undefined = variables) =>
        fetchGQL<TData, TVariables>(queryDoc, variablesArg)(),
      options
    );
  }

  function useGQLInfiniteQuery<
    TData = Record<string, any>,
    TVariables = Record<string, any>
  >(
    queryDoc: DocumentNode<TData, TVariables> | string,
    getVariables: (pageParam?: any) => TVariables,
    options?: UseInfiniteQueryOptions<TData, Error, TData>
  ): UseInfiniteQueryResult<TData, Error> {
    return useInfiniteQuery<TData, Error, TData>(
      getKey(queryDoc),
      ({ pageParam }) => {
        return fetchGQL<TData, TVariables>(queryDoc, getVariables(pageParam))();
      },
      options
    );
  }

  function getQueryString(doc: DocumentNode | string) {
    if (typeof doc === "string") return doc;

    let queryString = documentsMap.get(doc);

    if (queryString == null) {
      queryString = print(doc);
      documentsMap.set(doc, queryString);
    }

    return queryString;
  }

  const headers = proxy<Record<string, string>>({
    "content-type": "application/json",
  });

  const useHeadersSnapshot = () => useSnapshot(headers);

  function fetchGQL<
    TData = Record<string, any>,
    TVariables = Record<string, any>
  >(
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

  function getKey<TVariables>(
    queryDoc: DocumentNode<any, TVariables> | string,
    variables?: TVariables
  ): QueryKey {
    const key = getQueryString(queryDoc);

    return variables === undefined ? [key, variables] : [key];
  }

  return {
    useGQLQuery,
    useGQLMutation,
    useGQLInfiniteQuery,
    headers,
    fetchGQL,
    useHeadersSnapshot,
    configureRQ,
    getKey,
  };
}
