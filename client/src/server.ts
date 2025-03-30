import { treaty } from "@elysiajs/eden";
import type { App } from "../../server/src";

// @ts-expect-error unsure why this is needed
export const client = treaty<App>("localhost:3000");
