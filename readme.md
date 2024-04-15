# @dumbjs/search

> Unified Search Adaptor Model for various databases.

> [!NOTE]
> The library is still being developed, please only use it for beta testing and not on a productino project.

## Usage

**Install the library**

```sh
npm i --save @dumbjs/search
```

**Initialize a Collection Model**

```js
import { SearchCollection } from "@dumbjs/search";
import { RedisAdapter } from "@dumbjs/search/redis";

const collection = new SearchCollection({
  adapter: new RedisAdapter("UserSearch", {
    redis: client,
    name: "user-search",
  }),
});

// add in the required strings with the search terms string

await collection.set(1, "Foo");
await collection.set(2, "Foo Bar");
await collection.set(3, "Foo Bar Baz");

const result = await collection.search("Bar"); //=> [2,3]
```

## Credits

- [tj/reds](https://github.com/tj/reds) for the original implementation
- [antirez](http://oldblog.antirez.com/post/autocomplete-with-redis.html) for the more string prefix based solution
