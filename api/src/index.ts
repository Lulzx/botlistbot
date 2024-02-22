import { Hono } from "hono";

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.get("/", (c) => {
  return c.text("GET /search?username=file&name=convert&description=audio");
});

app.get("/gimme", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM bots").all()

  return c.json(results);
});

app.get("/search", async (c) => {
  const { name, username, description } = c.req.query();

  if (name?.length < 3 || username?.length < 3 || description?.length < 3) {
    return c.text("minimum query length allowed is 3.");
  } else if (username?.toLowerCase() === "bot") {
    return c.text("hmm... bot? be specific please!");
  } else if (!name && !username && !description) return c.json([]);

  const QUERY = `SELECT *
  FROM bots
  WHERE
      instr(lower(name), lower(COALESCE(:name, '')))
      AND
      instr(lower(username), lower(COALESCE(:username, '')))
      AND
      instr(lower(description), lower(COALESCE(:description, '')));`

  const { results } = await c.env.DB.prepare(QUERY).bind(name ?? '', username ?? '', description ?? '').all();

  return c.json(results);
});

export default app;
