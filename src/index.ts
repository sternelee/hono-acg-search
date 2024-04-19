import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";
import { cache } from "hono/cache";
import { parseFeed } from "./utils/parser";
import { torrentToMagnet } from "./utils";
import { ARG_SEARCH_MAP, IARG_FROM } from "./config";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello ACG fans!");
});

// Use prettyJSON middleware for all routes
app.use("*", prettyJSON());

app.get(
  "*",
  cache({
    cacheName: "hono-acg",
    cacheControl: "max-age=3600",
  })
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

app.post("/search", async (c) => {
  const {
    from = "acg",
    keyword,
    magnet = false,
  } = (await c.req.json()) as {
    from: IARG_FROM;
    keyword: string;
    magnet: boolean;
  };
  const url = ARG_SEARCH_MAP[from]
    ? ARG_SEARCH_MAP[from].href
    : ARG_SEARCH_MAP.acg.href;
  const keywords = keyword.replaceAll(" ", "+");
  console.log(url + keywords);
  const xml = await fetch(url + keywords, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
    },
  }).then((res) => res.text());
  if (xml) {
    const res = parseFeed(xml);
    if (magnet && from === "acg" && res?.items) {
      const items = res.items;
      for (let i = 0; i < items.length; i++) {
        items[i].torrent = items[i].torrent
          ? await torrentToMagnet(items[i].torrent || "")
          : "";
      }
      res.items = items;
    }
    return c.json(res);
  }
  return c.json({});
});

app.post("/magnet", async (c) => {
  const { url } = (await c.req.json()) as { url: string };
  let data = "";
  if (url) {
    data = await torrentToMagnet(url);
  }
  return c.json({ data });
});

export default app;
