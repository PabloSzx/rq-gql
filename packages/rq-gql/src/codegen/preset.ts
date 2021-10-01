import * as addPlugin from "@graphql-codegen/add";
import type { Types } from "@graphql-codegen/plugin-helpers";
import * as typedDocumentNodePlugin from "@graphql-codegen/typed-document-node";
import * as typescriptPlugin from "@graphql-codegen/typescript";
import * as typescriptOperationPlugin from "@graphql-codegen/typescript-operations";
import { ClientSideBaseVisitor } from "@graphql-codegen/visitor-plugin-common";
import type { Source } from "@graphql-tools/utils";
import type { FragmentDefinitionNode, OperationDefinitionNode } from "graphql";
import type { OperationOrFragment, SourceWithOperations } from "./plugin";
import * as gqlTagPlugin from "./plugin";

export type GqlTagConfig = {};

type BuildNameFunction = (
  type: OperationDefinitionNode | FragmentDefinitionNode
) => string;

function processSources(sources: Array<Source>, buildName: BuildNameFunction) {
  const sourcesWithOperations: Array<SourceWithOperations> = [];

  for (const source of sources) {
    const { document } = source;
    const operations: Array<OperationOrFragment> = [];

    if (!document?.definitions) continue;

    for (const definition of document.definitions) {
      if (
        (definition?.kind !== `OperationDefinition` &&
          definition?.kind !== "FragmentDefinition") ||
        definition.name?.kind !== `Name`
      )
        continue;

      operations.push({
        initialName: buildName(definition),
        definition,
      });
    }

    if (operations.length === 0) continue;

    sourcesWithOperations.push({
      source,
      operations,
    });
  }

  return sourcesWithOperations;
}

export const preset: Types.OutputPreset<GqlTagConfig> = {
  buildGeneratesSection: (options) => {
    const visitor = new ClientSideBaseVisitor(
      options.schemaAst!,
      [],
      options.config,
      options.config
    );
    const sourcesWithOperations = processSources(options.documents, (node) => {
      if (node.kind === "FragmentDefinition") {
        return visitor.getFragmentVariableName(node);
      }
      return visitor.getOperationVariableName(node);
    });
    const sources = sourcesWithOperations.map(({ source }) => source);

    const pluginMap = {
      ...options.pluginMap,
      [`add`]: addPlugin,
      [`typescript`]: typescriptPlugin,
      [`typescript-operations`]: typescriptOperationPlugin,
      [`typed-document-node`]: typedDocumentNodePlugin,
      [`gen-dts`]: gqlTagPlugin,
    };

    const plugins: Array<Types.ConfiguredPlugin> = [
      { [`add`]: { content: `/* eslint-disable */` } },
      { [`typescript`]: {} },
      { [`typescript-operations`]: {} },
      { [`typed-document-node`]: {} },
      ...options.plugins,
    ];

    const genDtsPlugins: Array<Types.ConfiguredPlugin> = [
      { [`add`]: { content: `/* eslint-disable */` } },
      { [`gen-dts`]: { sourcesWithOperations } },
    ];

    return [
      {
        filename: `${options.baseOutputDir}/graphql.ts`,
        plugins,
        pluginMap,
        schema: options.schema,
        config: options.config,
        documents: sources,
      },
      {
        filename: `${options.baseOutputDir}/index.ts`,
        plugins: genDtsPlugins,
        pluginMap,
        schema: options.schema,
        config: options.config,
        documents: sources,
      },
    ];
  },
};
