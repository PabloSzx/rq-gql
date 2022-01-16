import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
import type { ExecutionResult } from "graphql";
import { print } from "graphql/language/printer.js";
import { getOperationAST } from "graphql/utilities/getOperationAST.js";
import { createContext, createElement, FC, useContext } from "react";
import {
  QueryClientProvider,
  QueryClientProviderProps,
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
import { proxy } from "valtio";

export type QueryFetcher = <
  TData = Record<string, any>,
  TVariables = Record<string, any>
>(
  query: string,
  variables?: TVariables | undefined
) => () => Promise<TData>;

export type FetchGQL = <
  TData = Record<string, any>,
  TVariables = Record<string, any>
>(
  queryDoc: DocumentNode<TData, TVariables> | string,
  variables?: TVariables | undefined
) => () => Promise<TData>;

export const rqGQLContext = createContext<RQGQLClient | null>(null);

const useRQGQLContext = () => {
  const ctx = useContext(rqGQLContext);

  if (ctx == null) throw Error("rqGQLProvider is not present!");

  return ctx;
};

export class RQGQLClient {
  public readonly headers: { [K in string]?: string };
  public readonly fetchOptions;
  public readonly fetchGQL: FetchGQL;

  constructor(
    options: (
      | {
          queryFetcher: QueryFetcher;
          endpoint?: never;
        }
      | {
          queryFetcher?: never;
          endpoint: string;
        }
    ) & {
      headers?: { [K in string]?: string };
      fetchOptions?: Partial<RequestInit>;
    }
  ) {
    const headers = (this.headers = proxy<{ [K in string]?: string }>({
      "content-type": "application/json",
      ...options.headers,
    }));

    const fetchOptions = (this.fetchOptions = { ...options.fetchOptions });

    const { endpoint } = options;

    const queryFetcher: QueryFetcher =
      options.queryFetcher ||
      (() => {
        if (!endpoint) throw Error("Endpoint not specified for rqGQLProvider!");

        return defaultQueryFetcher(endpoint, {
          headers,
          fetchOptions,
        });
      })();

    const fetchsOnTheFly: Record<string, Promise<any>> = {};

    this.fetchGQL = (queryDoc, variables) => {
      return async () => {
        const queryString = getQueryString(queryDoc);

        const fetchKey = variables
          ? queryString + JSON.stringify(variables)
          : queryString;

        const existingFetch = fetchsOnTheFly[fetchKey];

        if (existingFetch) return existingFetch;

        try {
          return await (fetchsOnTheFly[fetchKey] = queryFetcher<any>(
            queryString,
            variables
          )());
        } finally {
          delete fetchsOnTheFly[fetchKey];
        }
      };
    };
  }
}

export const RQGQLProvider: FC<{ rqGQLClient: RQGQLClient }> = ({
  children,
  rqGQLClient: value,
}) => {
  return createElement(rqGQLContext.Provider, {
    children,
    value,
  });
};

export const CombinedRQGQLProvider: FC<
  QueryClientProviderProps & { rqGQLClient: RQGQLClient }
> = ({ rqGQLClient, ...reactQuery }) => {
  return createElement(rqGQLContext.Provider, {
    children: createElement(QueryClientProvider, reactQuery),
    value: rqGQLClient,
  });
};

export type DefaultQueryFetcherOptions = {
  headers?: { [K in string]?: string };
  fetchOptions?: Partial<RequestInit>;
};

export const defaultQueryFetcher: (
  endpoint: string,
  options?: DefaultQueryFetcherOptions
) => QueryFetcher =
  (endpoint, { headers, fetchOptions } = {}) =>
  (query, variables) => {
    return async () => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...headers,
        },
        body: JSON.stringify({ query, variables }),
        ...fetchOptions,
      });

      const { errors, data }: ExecutionResult<any> = await res.json();

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

      return data;
    };
  };

const documentPrintCache = new WeakMap<DocumentNode<any, any>, string>();

function getQueryString<Result, Variables>(
  doc: DocumentNode<Result, Variables> | string
) {
  if (typeof doc === "string") return doc;

  let queryString = documentPrintCache.get(doc);

  if (queryString == null) {
    queryString = print(doc);
    documentPrintCache.set(doc, queryString);
  }

  return queryString;
}

const operationASTCache = new WeakMap<DocumentNode<any, any>, string | null>();

export function getKey<TVariables>(
  queryDoc: DocumentNode<any, TVariables> | string,
  variables?: TVariables
): readonly [string, TVariables?] {
  let key: string;

  if (typeof queryDoc === "string") {
    key = queryDoc;
  } else {
    let astCacheValue = operationASTCache.get(queryDoc);

    if (astCacheValue) {
      key = astCacheValue;
    } else if (astCacheValue === undefined) {
      astCacheValue = getOperationAST(queryDoc)?.name?.value || null;

      operationASTCache.set(queryDoc, astCacheValue);

      key = astCacheValue || getQueryString(queryDoc);
    } else {
      key = getQueryString(queryDoc);
    }
  }

  return variables == null ? [key] : [key, variables];
}

export function useGQLQuery<
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
  const { fetchGQL } = useRQGQLContext();

  return useQuery(
    getKey(queryDoc, variables),
    fetchGQL(queryDoc, variables),
    options
  );
}

export function useGQLMutation<
  TData = Record<string, any>,
  TVariables = Record<string, any>
>(
  queryDoc: DocumentNode<TData, TVariables> | string,
  options?: Omit<
    UseMutationOptions<TData, Error, TVariables, any>,
    "queryKey" | "queryFn"
  >
): UseMutationResult<TData, Error, TVariables> {
  const { fetchGQL } = useRQGQLContext();

  return useMutation<TData, Error, TVariables>(
    (variables?: TVariables) =>
      fetchGQL<TData, TVariables>(queryDoc, variables)(),
    options
  );
}

export function useGQLInfiniteQuery<
  TData = Record<string, any>,
  TVariables = Record<string, any>
>(
  queryDoc: DocumentNode<TData, TVariables> | string,
  getVariables: (pageParam?: any) => TVariables,
  options?: UseInfiniteQueryOptions<TData, Error, TData>
): UseInfiniteQueryResult<TData, Error> {
  const { fetchGQL } = useRQGQLContext();

  return useInfiniteQuery<TData, Error, TData>(
    options?.queryKey || getKey(queryDoc),
    ({ pageParam }) => {
      return fetchGQL<TData, TVariables>(queryDoc, getVariables(pageParam))();
    },
    options
  );
}
