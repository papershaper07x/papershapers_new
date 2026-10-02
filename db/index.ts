import postgres from "postgres";

type QueryClient = ReturnType<typeof postgres>;
type QueryExecutor = Pick<QueryClient, "unsafe">;

function convertQuery(input: string) {
  const ignored = input.includes("INSERT OR IGNORE INTO");
  let query = input.replace("INSERT OR IGNORE INTO", "INSERT INTO");
  let index = 0;
  query = query.replace(/\?/g, () => `$${++index}`);
  if (ignored && !/ON CONFLICT/i.test(query)) query = `${query.replace(/;\s*$/, "")} ON CONFLICT DO NOTHING`;
  return query;
}

class PostgresStatement {
  private values: unknown[] = [];

  constructor(private readonly client: QueryExecutor, private readonly query: string) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async execute(client: QueryExecutor = this.client) {
    return client.unsafe(convertQuery(this.query), this.values as never[]);
  }

  async run() {
    await this.execute();
    return { success: true };
  }

  async first<T>() {
    const rows = await this.execute();
    return (rows[0] as T | undefined) ?? null;
  }

  async all<T>() {
    const rows = await this.execute();
    return { results: rows as unknown as T[] };
  }
}

class PostgresDatabase {
  constructor(private readonly client: QueryClient) {}

  prepare(query: string) {
    return new PostgresStatement(this.client, query);
  }

  async batch(statements: PostgresStatement[]) {
    return this.client.begin(async (transaction) => {
      const results = [];
      for (const statement of statements) results.push(await statement.execute(transaction));
      return results;
    });
  }
}

let database: PostgresDatabase | undefined;

export function getDb() {
  if (database) return database;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required. Run the committed PostgreSQL migrations before starting the web app.");
  database = new PostgresDatabase(postgres(process.env.DATABASE_URL, { max: 5, idle_timeout: 20 }));
  return database;
}
