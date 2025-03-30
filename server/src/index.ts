import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import fs from "fs/promises";
import { randomUUIDv7 } from "bun";

// if prod use root "/persistent"
// if dev use local "persistent"
const PERSISTENT_DIR = process.env.PORT ? "/persistent" : "persistent";

const app = new Elysia()
  .use(cors({ origin: true }))
  .get("/", () => "Hi Elysia")
  .get("/levels", async () => {
    // return all file names in `persistent`
    return await fs.readdir(PERSISTENT_DIR);
  })
  .post(
    "/level/create",
    ({ body }) => {
      // TODO: verify it's a valid level

      // create a new level
      const uuid = randomUUIDv7();
      fs.writeFile(`${PERSISTENT_DIR}/${uuid}`, body);
      return uuid;
    },
    { body: t.String() },
  )
  .get("/level/:level", async ({ params: { level } }) => {
    return JSON.parse(
      (await fs.readFile(`${PERSISTENT_DIR}/${level}`)).toString(),
    );
  })
  .listen({ port: process.env.PORT || 3000 }, () => {
    console.log(`Listening on port ${process.env.PORT || 3000}`);
  });

export type App = typeof app;
