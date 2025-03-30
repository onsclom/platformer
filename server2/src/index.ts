// server.ts
import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";

const app = new Elysia()
  .use(cors({ origin: true }))
  .get("/", () => "Hi Elysia")
  .get("/id/:id", ({ params: { id } }) => id)
  .post("/mirror", ({ body }) => body, {
    body: t.Object({
      id: t.Number(),
      name: t.String(),
    }),
  })
  .listen({ port: process.env.PORT || 3000 }, () => {
    console.log(`Listening on port ${process.env.PORT || 3000}`);
  });

export type App = typeof app;
