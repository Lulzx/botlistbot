import { Hono } from "hono";
import { HonoContext, Category, Bot } from "./types";

const app = new Hono<HonoContext>()

app.get("/", (c) => {
  return c.text("GET /search?username=file&name=convert&description=audio");
});

app.get("/categories", (c) => {
  const categories: Category[] = [
    { id: 1, name: "🌿 Miscellaneous" },
    { id: 2, name: "👥 Social" },
    { id: 3, name: "🙋‍♂️ Promoting" },
    { id: 4, name: "🛍 Shopping" },
    { id: 5, name: "😂 Humor" },
    { id: 6, name: "🎮 Gaming" },
    { id: 7, name: "🏋️‍♂️ HTML5 Games" },
    { id: 8, name: "🤖 Bot creating" },
    { id: 9, name: "⚒ Sticker pack creation" },
    { id: 10, name: "🧸 Stickers & Gif's" },
    { id: 11, name: "🍟 Video" },
    { id: 12, name: "📸 Photography" },
    { id: 13, name: "🎧 Music" },
    { id: 14, name: "⚽ Sports" },
    { id: 15, name: "☔️ Weather" },
    { id: 16, name: "📰 News" },
    { id: 17, name: "✈️ Places & Traveling" },
    { id: 18, name: "📞 Android & Tech News" },
    { id: 19, name: "📲 Apps & software" },
    { id: 20, name: "📚 Books & Magazines" },
    { id: 21, name: "📓 Translation and dictionaries" },
    { id: 22, name: "💳 Public ID's" },
    { id: 23, name: "📝 Text Formatting" },
    { id: 24, name: "📦 Multiuse" },
    { id: 25, name: "🛠️ Group & channel tools" },
    { id: 26, name: "🍃 Inline Web Search" },
    { id: 27, name: "⏰ Organization and reminders" },
    { id: 28, name: "⚙️ Tools" }
  ];

  return c.json(categories);
});

app.get("/gimme", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM bots").all<Bot>()

  return c.json(results);
});

app.get("/bots/category/:id", async (c) => {
  const categoryId = parseInt(c.req.param('id'), 10);

  if (isNaN(categoryId)) {
    return c.json({ error: 'Invalid category ID provided.' }, 400);
  }

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM bots WHERE category_id = ?"
  ).bind(categoryId).all<Bot>();

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

  const { results } = await c.env.DB.prepare(QUERY).bind(name ?? '', username ?? '', description ?? '').all<Bot>();

  return c.json(results);
});

export default app;
