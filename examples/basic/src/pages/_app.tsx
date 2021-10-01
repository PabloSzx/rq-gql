import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "react-query";
import { configureRQ } from "../generated";

configureRQ({
  endpoint: "https://learner-model.pablosz.dev/graphql",
});

const client = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={client}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
