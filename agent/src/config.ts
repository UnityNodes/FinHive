import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../.env");
if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export const config = {
  ledgerApiBase: required("LEDGER_API_BASE"),
  auth0TokenUrl: required("AUTH0_TOKEN_URL"),
  auth0Audience: required("AUTH0_AUDIENCE"),
  auth0ClientId: required("AUTH0_M2M_CLIENT_ID"),
  auth0ClientSecret: required("AUTH0_M2M_CLIENT_SECRET"),
  operatorParty: required("DAML_OPERATOR_PARTY"),
  agentParty: required("AGENT_PARTY"),
  ceoParty: required("CEO_PARTY"),
  apParty: required("AP_PARTY"),
  vendorParty: required("VENDOR_PARTY"),
  packageName: required("FINHIVE_PACKAGE_NAME"),
  llmBaseUrl: process.env["LLM_BASE_URL"] ?? "https://api.groq.com/openai/v1",
  llmApiKey: process.env["LLM_API_KEY"] ?? "",
  llmModel: process.env["LLM_MODEL"] ?? "llama-3.3-70b-versatile",
} as const;
