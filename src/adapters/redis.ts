import type { Redis } from "ioredis";
import natural from "natural";

const nMetaphone = new natural.DoubleMetaphone();
const nStem = natural.PorterStemmer.stem;

import { Adapter } from "../contract/adapter.js";

const types = {
  intersect: "zinterstore",
  union: "zunionstore",
  and: "zinterstore",
  or: "zunionstore",
};

type ProcessLanguage = {
  words: string[];
  counts: Record<string, number>;
  map: Record<string, string[]>;
  keys: string[];
  metaphoneKeys: string[] | null;
};

export type SearchOptions = {
  type: keyof typeof types;
  between: {
    from: number;
    to: number;
  };
};

export enum MODES {
  phonetic,
}

export type Options = {
  client: Redis;
  mode: MODES;
};

type SearchResult = Array<string | number>;

export class RedisAdapter implements Adapter<SearchOptions, SearchResult> {
  redis: Redis;
  index: string;
  mode: MODES;
  constructor(name: string, options: Options) {
    this.redis = options.client;
    this.mode = options.mode;
    this.index = name;
  }
  async set(id: string | number, text: string) {
    const processed = processLanguage(text, id);
    await writeToIndex(this.redis, this.index, id, processed);
    return true;
  }

  async delete(id: string | number) {
    await removeFromIndex(this.redis, this.index, id);
    return true;
  }

  async search(text: string, options?: SearchOptions) {
    if (this.mode != MODES.phonetic) {
      throw new Error("We only support phonetic search right now");
    }

    const nlpObj = processLanguage(text, this.index);
    const keys = nlpObj.metaphoneKeys;
    const _type = options?.type ? types[options.type] : null;
    const type = _type ?? types["and"];
    const start = options?.between?.from ?? 0;
    const stop = options?.between?.to ?? -1;

    if (!keys?.length) return [];
    const tkey = this.index + "tmpkey";
    const result = await this.redis
      .multi([
        [type, tkey, keys.length].concat(keys),
        ["zrange", tkey, start, stop, "REV"],
        ["zremrangebyrank", tkey, start, stop],
      ])
      .exec();

    if (!result?.length) {
      return [];
    }

    return result[1][1] as SearchResult;
  }
}

function processLanguage(str: string, id: string | number) {
  const words = getStemWords(getWords(str));
  const counts = wordLength(words);
  const map = generateMetaphoneMap(words);
  const keys = Object.keys(map);
  const metaphoneKeys = !id ? null : getMetaphoneKeys(id, words);

  return {
    words,
    counts,
    map,
    keys,
    metaphoneKeys,
  };
}

async function writeToIndex(
  client: Redis,
  index: string,
  id: number | string,
  nlpObj: ProcessLanguage,
) {
  const cmds: any[] = [];
  nlpObj.keys.forEach(function (word: string, i) {
    nlpObj.map[word].forEach((wordKey: string) => {
      cmds.push(["zadd", index + ":word:" + wordKey, nlpObj.counts[word], id]);
      cmds.push([
        "zadd",
        index + ":object:" + id,
        nlpObj.counts[word],
        wordKey,
      ]);
    });
  });
  await client.multi(cmds).exec();
}

async function removeFromIndex(
  client: Redis,
  index: string,
  id: string | number,
) {
  const constants = await client.zrevrangebyscore(
    index + ":object:" + id,
    "+inf",
    0,
  );
  const multi = client.multi().del(index + ":object:" + id);
  for (let c of constants) {
    multi.zrem(index + ":word:" + c, id);
  }
  return await multi.exec();
}

function getWords(str: string) {
  return String(str).match(/\w+/g) as string[];
}

function getStemWords(words: string[]) {
  const ret: string[] = [];
  if (!words) return ret;
  for (let i = 0, len = words.length; i < len; ++i) {
    ret.push(nStem(words[i]));
  }
  return ret;
}

function wordLength(words: string[]) {
  const obj: Record<string, number> = {};
  if (!words) return obj;
  for (let i = 0, len = words.length; i < len; ++i) {
    obj[words[i]] = (obj[words[i]] || 0) + 1;
  }
  return obj;
}

function generateMetaphoneMap(words: string[]) {
  const obj: Record<string, string[]> = {};
  if (!words) return obj;
  for (let i = 0, len = words.length; i < len; ++i) {
    const keys = nMetaphone.process(words[i]);
    obj[words[i]] = keys;
  }
  return obj;
}

function toMetaphoneArray(words: string[]) {
  const arr: string[] = [];
  let constant: string[] | undefined;

  if (!words) return arr;

  for (let i = 0, len = words.length; i < len; ++i) {
    constant = nMetaphone.process(words[i]);
    constant.forEach((d) => {
      if (!arr.includes(d)) arr.push(d);
    });
  }

  return arr;
}

function getMetaphoneKeys(id: string | number, words: string[]) {
  return toMetaphoneArray(words)
    .map((c) => id + ":word:" + c);
}
