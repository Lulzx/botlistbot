import { Hono } from "hono";
import { HonoContext, Category, Bot } from "./types";

const CATEGORIES: Category[] = [
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

const app = new Hono<HonoContext>()

app.get("/", (c) => {
  return c.text("GET /search?username=file&name=convert&description=audio");
});

app.get("/categories", (c) => {
  return c.json(CATEGORIES);
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

  // Validate input lengths
  if ((name && name.length < 3) || (username && username.length < 3) || (description && description.length < 3)) {
    return c.json({ error: "minimum query length allowed is 3." }, 400);
  } 
  
  if (username?.toLowerCase() === "bot") {
    return c.json({ error: "hmm... bot? be specific please!" }, 400);
  } 
  
  if (!name && !username && !description) {
    return c.json([]);
  }

  // Build dynamic query with proper parameter binding
  const conditions = [];
  const params = [];

  if (name) {
    conditions.push("LOWER(name) LIKE LOWER(?)");
    params.push(`%${name}%`);
  }
  
  if (username) {
    conditions.push("LOWER(username) LIKE LOWER(?)");
    params.push(`%${username}%`);
  }
  
  if (description) {
    conditions.push("LOWER(description) LIKE LOWER(?)");
    params.push(`%${description}%`);
  }

  const query = `SELECT * FROM bots WHERE ${conditions.join(' AND ')}`;

  try {
    const { results } = await c.env.DB.prepare(query).bind(...params).all<Bot>();
  return c.json(results);
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
