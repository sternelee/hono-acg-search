import { parseDOM, type Options } from "htmlparser2";
import {
  getElementsByTagName,
  textContent,
  type Feed,
  type FeedItem,
  type FeedItemMedia,
  type FeedItemMediaMedium,
  type FeedItemMediaExpression,
} from "domutils";
import type { AnyNode, Element } from "domhandler";

export type TorrentFeedItem = FeedItem & {
  guid?: string;
  torrent?: string;
};

type FeedOmit = Omit<Feed, "items">;

export type TorrentFeed = FeedOmit & {
  items: TorrentFeedItem[];
};

function getOneElement(
  tagName: string | ((name: string) => boolean),
  node: AnyNode[],
): Element | null {
  return getElementsByTagName(tagName, node, true, 1)[0];
}

function isValidFeed(value: string) {
  return value === "rss" || value === "feed" || value === "rdf:RDF";
}

/**
 * Get the text content of an element with a certain tag name.
 *
 * @param tagName Tag name to look for.
 * @param where Node to search in.
 * @param recurse Whether to recurse into child nodes.
 * @returns The text content of the element.
 */
function fetchElm(
  tagName: string,
  where: AnyNode | AnyNode[],
  recurse = false,
): string {
  const elements = getElementsByTagName(tagName, where, recurse, 1);
  const el = elements[0];
  if (el && el.name === "enclosure" && el.attribs) return el.attribs["url"];
  return textContent(elements).trim();
}

const MEDIA_KEYS_STRING = ["url", "type", "lang"] as const;

const MEDIA_KEYS_INT = [
  "fileSize",
  "bitrate",
  "framerate",
  "samplingrate",
  "channels",
  "duration",
  "height",
  "width",
] as const;

/**
 * Get all media elements of a feed item.
 *
 * @param where Nodes to search in.
 * @returns Media elements.
 */
function getMediaElements(where: AnyNode[]): FeedItemMedia[] {
  return getElementsByTagName("media:content", where).map((elem) => {
    const { attribs } = elem;

    const media: FeedItemMedia = {
      medium: attribs["medium"] as unknown as FeedItemMediaMedium | undefined,
      isDefault: !!attribs["isDefault"],
    };

    for (const attrib of MEDIA_KEYS_STRING) {
      if (attribs[attrib]) {
        media[attrib] = attribs[attrib];
      }
    }

    for (const attrib of MEDIA_KEYS_INT) {
      if (attribs[attrib]) {
        media[attrib] = parseInt(attribs[attrib], 10);
      }
    }

    if (attribs["expression"]) {
      media.expression = attribs[
        "expression"
      ] as unknown as FeedItemMediaExpression;
    }

    return media;
  });
}

/**
 * Adds a property to an object if it has a value.
 *
 * @param obj Object to be extended
 * @param prop Property name
 * @param tagName Tag name that contains the conditionally added property
 * @param where Element to search for the property
 * @param recurse Whether to recurse into child nodes.
 */
function addConditionally<T>(
  obj: T,
  prop: keyof T,
  tagName: string,
  where: AnyNode[],
  recurse = false,
) {
  const val = fetchElm(tagName, where, recurse);
  if (val) obj[prop] = val as unknown as T[keyof T];
}

/**
 * Parse an Atom feed.
 *
 * @param feedRoot The root of the feed.
 * @returns The parsed feed.
 */
function getAtomFeed(feedRoot: Element) {
  const childs = feedRoot.children;

  const feed: TorrentFeed = {
    type: "atom",
    items: getElementsByTagName("entry", childs).map((item) => {
      const { children } = item;
      const entry: TorrentFeedItem = { media: getMediaElements(children) };

      addConditionally(entry, "id", "id", children);
      addConditionally(entry, "title", "title", children);

      const href = getOneElement("link", children)?.attribs["href"];
      if (href) {
        entry.link = href;
      }

      const description =
        fetchElm("summary", children) || fetchElm("content", children);
      if (description) {
        entry.description = description;
      }

      const pubDate = fetchElm("updated", children);
      if (pubDate) {
        entry.pubDate = new Date(pubDate);
      }

      return entry;
    }),
  };

  addConditionally(feed, "id", "id", childs);
  addConditionally(feed, "title", "title", childs);
  const href = getOneElement("link", childs)?.attribs["href"];
  if (href) {
    feed.link = href;
  }
  addConditionally(feed, "description", "subtitle", childs);

  const updated = fetchElm("updated", childs);
  if (updated) {
    feed.updated = new Date(updated);
  }

  addConditionally(feed, "author", "email", childs, true);

  return feed;
}

/**
 * Parse a RSS feed.
 *
 * @param feedRoot The root of the feed.
 * @returns The parsed feed.
 */
function getRssFeed(feedRoot: Element) {
  const childs = getOneElement("channel", feedRoot.children)?.children ?? [];

  const feed: TorrentFeed = {
    type: feedRoot.name.substr(0, 3),
    id: "",
    items: getElementsByTagName("item", feedRoot.children).map(
      (item: Element) => {
        const { children } = item;
        const entry: TorrentFeedItem = { media: getMediaElements(children) };
        addConditionally(entry, "id", "guid", children);
        addConditionally(entry, "title", "title", children);
        addConditionally(entry, "link", "link", children);
        addConditionally(entry, "description", "description", children);
        const guid = fetchElm("guid", children);
        const torrent = fetchElm("enclosure", children);
        if (guid) {
          entry.guid = guid;
        }
        if (torrent) {
          entry.torrent = torrent;
        }
        const pubDate =
          fetchElm("pubDate", children) || fetchElm("dc:date", children);
        if (pubDate) entry.pubDate = new Date(pubDate);

        return entry;
      },
    ),
  };

  addConditionally(feed, "title", "title", childs);
  addConditionally(feed, "link", "link", childs);
  addConditionally(feed, "description", "description", childs);

  const updated = fetchElm("lastBuildDate", childs);
  if (updated) {
    feed.updated = new Date(updated);
  }

  addConditionally(feed, "author", "managingEditor", childs, true);

  return feed;
}

function getFeed(doc: AnyNode[]): TorrentFeed | null {
  const feedRoot = getOneElement(isValidFeed, doc);

  return !feedRoot
    ? null
    : feedRoot.name === "feed"
      ? getAtomFeed(feedRoot)
      : getRssFeed(feedRoot);
}

const parseFeedDefaultOptions = { xmlMode: true };

export function parseFeed(
  feed: string,
  options: Options = parseFeedDefaultOptions,
): TorrentFeed | null {
  return getFeed(parseDOM(feed, options));
}
