import { MongoClient } from 'mongodb';

export async function ensureDatabaseExists(uri: string): Promise<void> {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const dbName = db.databaseName;

    // await db.dropDatabase(); // Uncomment to drop the entire database

    const admin = client.db('admin');
    const { databases } = await admin.command({ listDatabases: 1 });
    const exists = databases.some((d: { name: string }) => d.name === dbName);

    if (exists) {
      console.log(`Database '${dbName}' already exists`);
    } else {
      console.log(`Database '${dbName}' will be created on first write`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error with database:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  } finally {
    await client.close();
  }
}
