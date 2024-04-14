import Redis from "ioredis";
import { MODES, SearchCollection } from "./src/SearchCollection";
import {test} from "node:test"
import assert from "assert/strict";

const client = new Redis();

test("basic",async()=>{
  const collection = new SearchCollection("UserSearch", {
    redis: client,
    mode: MODES.phonetic,
    name: "user-search",
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
  
  await client.disconnect()
  
  assert.deepEqual(result.map(x=>Number(x)),[3])
})
