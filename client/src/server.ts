import { treaty } from "@elysiajs/eden";
import type { App } from "../../server/src";
import { assert } from "./assert";

assert(import.meta.env.VITE_SERVER_URL);

// @ts-expect-error unsure why this is needed
export const client = treaty<App>(import.meta.env.VITE_SERVER_URL);
