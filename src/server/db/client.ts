import postgres from "postgres";

let client: postgres.Sql | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url || url.startsWith("https://")) return null;

  client ??= postgres(url, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
  });

  return client;
}

export function hasDatabase() {
  return Boolean(getDb());
}
