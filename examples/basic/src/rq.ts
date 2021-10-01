import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
import { ExecutionResult, print } from "graphql";
import { QueryKey, useQuery, UseQueryOptions } from "react-query";

const DocCache = new WeakMap<DocumentNode, string>();

export function useGQLQuery<TData, TVariables>(
  queryDoc: DocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: Omit<
    UseQueryOptions<TData, Error, TData, QueryKey>,
    "queryKey" | "queryFn"
  >
) {
  const key = getQueryString(queryDoc);
  return useQuery(
    variables === undefined ? [key, variables] : key,
    fetcher(queryDoc, variables),
    options
  );
}

function getQueryString(doc: DocumentNode) {
  let key = typeof doc === "string" ? doc : DocCache.get(doc);

  if (key == null) {
    key = print(doc);
    DocCache.set(doc, key);
  }

  return key;
}

function fetcher<TData, TVariables>(
  queryDoc: DocumentNode<TData, TVariables>,
  variables?: TVariables
) {
  return async (): Promise<TData> => {
    const query = getQueryString(queryDoc);
    const res = await fetch("https://learner-model.pablosz.dev/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
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
