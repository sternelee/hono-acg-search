export const SITE_ARG = "https://acg.rip"; // rss 返回 torrent 种子链接
export const SITE_DMHY = "https://share.dmhy.org"; // rss 返回 磁力链接
export const SITE_MIKANANI = "https://mikanani.me";
export const SITE_BANGUMI = "https://bangumi.moe/"; // TODO: rss搜索规则

export const ARG_SEARCH_LIST = [
  { name: "ACG.RIP", value: "arg", href: SITE_ARG + "/.xml?term=" }, // 空格用+合并
  {
    name: "动漫花园",
    value: "dmhy",
  }, // 空格用+合并
  {
    name: "密柑计划",
    value: "bangumi",
  }, // 空格用+合并
];

export const ARG_SEARCH_MAP = {
  acg: {
    name: "ACG.RIP",
    href: SITE_ARG + "/.xml?term=",
  },
  dmhy: {
    name: "动漫花园",
    href: SITE_DMHY + "/topics/rss/rss.xml?keyword=",
  },
  mikanani: {
    name: "密柑计划",
    href: SITE_MIKANANI + "/RSS/Search?searchstr=",
  },
};

export type IARG_FROM = keyof typeof ARG_SEARCH_MAP;
