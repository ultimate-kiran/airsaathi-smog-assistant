import { connection } from "next/server";
import App from "@/components/App";

export default async function Page() {
  // The CSP nonce is made per request (see proxy.ts), so the page must render per request too.
  await connection();
  return <App />;
}
