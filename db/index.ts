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

  constructor(private readonly client: QueryExecutor, private readonly query: string, private readonly pool?: QueryClient) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async execute(client: QueryExecutor = this.client): Promise<postgres.RowList<postgres.Row[]>> {
    if (this.pool && client === this.client) {
      return this.pool.begin(async (transaction) => {
        await transaction.unsafe("SET LOCAL statement_timeout = '10s'");
        return this.execute(transaction);
      });
    }
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
    return new PostgresStatement(this.client, query, this.client);
  }

  async batch(statements: PostgresStatement[]) {
    return this.client.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL statement_timeout = '10s'");
      const results = [];
      for (const statement of statements) results.push(await statement.execute(transaction));
      return results;
    });
  }

  async transaction<T>(operation: (db: { prepare(query: string): PostgresStatement }) => Promise<T>): Promise<T> {
    return this.client.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL statement_timeout = '10s'");
      return operation({ prepare: (query) => new PostgresStatement(transaction, query) });
    }) as Promise<T>;
  }
}

let database: PostgresDatabase | undefined;

export function getDb() {
  if (database) return database;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required. Run the committed PostgreSQL migrations before starting the web app.");
  const requestedPool = Number(process.env.DATABASE_POOL_MAX ?? 1);
  const max = Number.isInteger(requestedPool) && requestedPool >= 1 && requestedPool <= 5 ? requestedPool : 1;
  database = new PostgresDatabase(postgres(process.env.DATABASE_URL, { max, idle_timeout: 10, connect_timeout: 10 }));
  return database;
}
