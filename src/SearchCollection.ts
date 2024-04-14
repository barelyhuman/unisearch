import { Adapter } from "./contract/adapter.js";

type Options<T, S> = {
  adapter: Adapter<T, S>;
};

export class SearchCollection<SearchOptions, SearchResult> {
  adapter: Adapter<SearchOptions, SearchResult>;
  constructor(options: Options<SearchOptions, SearchResult>) {
    this.adapter = options.adapter;
  }

  async set(id: string | number, text: string) {
    return this.adapter.set(id, text);
  }

  async delete(id: string | number) {
    return this.adapter.delete(id);
  }

  async search(text: string, options?: SearchOptions) {
    return this.adapter.search(text, options);
  }
}
