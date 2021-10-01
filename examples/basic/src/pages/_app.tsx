import type { AppProps } from "next/app";
import { QueryClientProvider, QueryClient } from "react-query";

const client = new QueryClient();
export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={client}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
