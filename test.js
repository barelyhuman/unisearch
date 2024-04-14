import Redis from "ioredis";
import { SearchCollection } from "./src/SearchCollection";
import { RedisAdapter, MODES } from "./src/adapters/redis";
import { test } from "node:test";
import assert from "assert/strict";

await test("Redis", async (t) => {
  let client;
  
  t.before(async () => {
    client = new Redis();
    if (client.status === "connecting") return;
  });

  t.after(async () => {
    await client.disconnect();
  });

  await t.test("basic", async () => {
    const collection = new SearchCollection({
      adapter: new RedisAdapter("UserSearch", {
        mode: MODES.phonetic,
        client: client,
      }),
    });

    await collection.set(1, "hello");
    await collection.set(2, "what's up");
    await collection.set(3, "foo bar");

    const result = await collection.search("foo bar", {
      type: "and",
      between: {
        from: 0,
        to: -1,
      },
    });

    assert.deepEqual(
      result.map((x) => Number(x)),
      [3]
    );
  });
});
