import type { AppProps } from "next/app";
import { CombinedRQGQLProvider } from "rq-gql";
import { client, rqGQLClient } from "../client";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CombinedRQGQLProvider client={client} rqGQLClient={rqGQLClient}>
      <Component {...pageProps} />
    </CombinedRQGQLProvider>
  );
}
