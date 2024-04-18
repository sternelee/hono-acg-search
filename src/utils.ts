import { parseFeed } from "htmlparser2";

export interface IItem {
  title: string;
  description: string;
  pubDate: string;
  link: string;
  guid: string;
  torrent: string;
}

export interface IRSS {
  title: string;
  description: string;
  link: string;
  ttl: number;
  items: IItem[];
}

export async function fetchRss(href: string): Promise<any[]> {
  const text = await fetch(href).then((res) => res.text());
  const res = parseFeed(text);
  return res?.items.filter((v) => v.link) || [];
}
