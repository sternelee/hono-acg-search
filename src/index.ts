import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";
import { cache } from "hono/cache";
import { parseFeed } from "htmlparser2";
import { ARG_SEARCH_MAP, IARG_FROM } from "./config"

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// Use prettyJSON middleware for all routes
app.use("*", prettyJSON());

app.get(
  "*",
  cache({
    cacheName: "hono-acg",
    cacheControl: "max-age=3600",
  }),
);

/**
 * Default route when no other route matches.
 * Returns a JSON response with a message and status code 404.
 */
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404));

/**
 * Global error handler.
 * If error is instance of HTTPException, returns the custom response.
 * Otherwise, logs the error and returns a JSON response with status code 500.
 */
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  c.status(500);
  return c.json({ status: "failure", message: err.message });
});

app.post('/search', async (c) => {
  const { from = 'acg', keyword } = await c.req.json() as { from: IARG_FROM, keyword: string }
  const url = ARG_SEARCH_MAP[from] ? ARG_SEARCH_MAP[from].href : ARG_SEARCH_MAP.acg.href
  const keywords = keyword.replaceAll(' ', '+')
  const xml = await fetch(url + keywords).then(res => res.text())
  const res = parseFeed(xml);
  return c.json(res)
})

export default app;
