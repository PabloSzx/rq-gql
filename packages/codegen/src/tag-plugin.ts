import type { PluginFunction } from "@graphql-codegen/plugin-helpers";
import type { Source } from "@graphql-tools/utils";
import type { FragmentDefinitionNode, OperationDefinitionNode } from "graphql";

export type OperationOrFragment = {
  initialName: string;
  definition: OperationDefinitionNode | FragmentDefinitionNode;
};

export type SourceWithOperations = {
  source: Source;
  operations: Array<OperationOrFragment>;
};

const documentTypePartial = `
export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<
  infer TType,
  any
>
  ? TType
  : never;
`;

export const plugin: PluginFunction<{
  sourcesWithOperations: Array<SourceWithOperations>;
  useTypeImports?: boolean;
}> = (_, __, { sourcesWithOperations, useTypeImports }, _info) => {
  if (!sourcesWithOperations) {
    return "";
  }
  return [
    `import * as graphql from './graphql';\n`,
    `${
      useTypeImports ? "import type" : "import"
    } { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';\n`,
    `\n`,
    ...getDocumentRegistryChunk(sourcesWithOperations),
    `\n`,
    ...getGqlOverloadChunk(sourcesWithOperations),
    `\n`,
    `export function gql(source: string): DocumentNode;\n`,
    `export function gql(source: string) {\n`,
    `  return (documents as any)[source] ?? source;\n`,
    `}\n`,
    documentTypePartial,
  ].join(``);
};

const EscapedStrings: Record<string, string> = {};

export const escapeString = (str: string) =>
  (EscapedStrings[str] ||= JSON.stringify(str.replace(/\r\n/g, "\n")));

function getDocumentRegistryChunk(
  sourcesWithOperations: Array<SourceWithOperations> = []
) {
  const lines = new Set<string>();
  lines.add(`const documents = {\n`);

  for (const { operations, ...rest } of sourcesWithOperations) {
    const originalString = rest.source.rawSDL;

    const operation = operations[0];

    if (!originalString || !operation) continue;

    lines.add(
      `    ${escapeString(originalString)}: graphql.${operation.initialName},\n`
    );
  }

  lines.add(`};\n`);

  return lines;
}

function getGqlOverloadChunk(
  sourcesWithOperations: Array<SourceWithOperations>
) {
  const lines = new Set<string>();

  // We intentionally don't use a <T extends keyof typeof documents> generic, because TS
  // would print very long `gql` function signatures (duplicating the source).
  for (const { operations, ...rest } of sourcesWithOperations) {
    const originalString = rest.source.rawSDL;
    if (!originalString) continue;

    const escapedOriginalString = escapeString(originalString);

    lines.add(
      `export function gql(source: ${escapedOriginalString}): (typeof documents)[${escapedOriginalString}];\n`
    );
  }

  return lines;
}
