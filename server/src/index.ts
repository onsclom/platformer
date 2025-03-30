import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import fs from "fs/promises";
import { randomUUIDv7 } from "bun";

// if prod use root "/persistent"
// if dev use local "persistent"
const persistentDir = process.env.PORT ? "/persistent" : "persistent";

const levelsDir = `${persistentDir}/levels`;
// if levels folder doesn't exist, create it
await fs.mkdir(levelsDir).catch(() => {});

const app = new Elysia()
  .use(cors({ origin: true }))
  .get("/", () => "Hi Elysia")
  .get("/levels", async () => {
    // return all file names in `persistent`
    return await fs.readdir(levelsDir);
  })
  .post(
    "/level/create",
    ({ body }) => {
      // TODO: verify it's a valid level

      // create a new level
      const uuid = randomUUIDv7();
      fs.writeFile(`${levelsDir}/${uuid}`, body);
      return uuid;
    },
    { body: t.String() },
  )
  .get("/level/:level", async ({ params: { level } }) => {
    return JSON.parse((await fs.readFile(`${levelsDir}/${level}`)).toString());
  })
  .listen({ port: process.env.PORT || 3000 }, () => {
    console.log(`Listening on port ${process.env.PORT || 3000}`);
  });

export type App = typeof app;
