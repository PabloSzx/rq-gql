/* eslint-disable */
import * as graphql from "./graphql";
import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

const documents = {
  "\n      query hello {\n        hello\n      }\n    ": graphql.HelloDocument,
};

export function gql(
  source: "\n      query hello {\n        hello\n      }\n    "
): typeof documents["\n      query hello {\n        hello\n      }\n    "];

export function gql(source: string): DocumentNode;
export function gql(source: string) {
  return (documents as any)[source] ?? source;
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
