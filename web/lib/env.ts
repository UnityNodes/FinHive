import "server-only";
import { z } from "zod";

const schema = z.object({
  LEDGER_API_BASE: z.string().url(),
  AUTH0_TOKEN_URL: z.string().url(),
  AUTH0_AUDIENCE: z.string().min(1),
  AUTH0_SCOPE: z.string().min(1),
  AUTH0_M2M_CLIENT_ID: z.string().min(1),
  AUTH0_M2M_CLIENT_SECRET: z.string().min(1),
  DAML_OPERATOR_PARTY: z.string().min(1),
  AGENT_PARTY: z.string().min(1),
  CEO_PARTY: z.string().min(1),
  AP_PARTY: z.string().min(1),
  VENDOR_PARTY: z.string().min(1),
  CUSTOMER_PARTY: z.string().min(1),
  HR_PARTY: z.string().min(1),
  FINHIVE_PACKAGE_NAME: z.string().min(1),
});

export type Env = z.infer<typeof schema>;

let _env: Env | undefined;

export function getEnv(): Env {
  if (_env) return _env;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }
  _env = parsed.data;
  return _env;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});
