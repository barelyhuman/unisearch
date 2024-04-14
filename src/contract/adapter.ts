export class Adapter<SearchOptions, SearchReturn extends unknown> {
  constructor(...args: any) {}
  async set(id: string | number, text: string): Promise<boolean> {
    return false;
  }
  async delete(id: string | number): Promise<boolean> {
    return false;
  }
  async search(text: string, options?: SearchOptions): Promise<SearchReturn> {
    return {} as SearchReturn;
  }
}
