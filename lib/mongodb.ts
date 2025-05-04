import { MongoClient, Db, Collection } from 'mongodb';
import { LRUCache } from 'lru-cache';

const CACHE_TTL = 30000; // 30 seconds
const CACHE_SIZE = 100; // Maximum number of cached items

const cache = new LRUCache({
  max: CACHE_SIZE,
  ttl: CACHE_TTL,
  updateAgeOnGet: true, // Update TTL when accessed
  fetchMethod: async (key: string) => {
    // Implement fetch method for cache misses
    console.log('Cache miss, fetching from DB:', key);
    return null;
  }
});

const MONGODB_URI = process.env.MONGODB_URI as string;
const MONGODB_DB = process.env.MONGODB_DB as string;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI environment variable');
}

if (!MONGODB_DB) {
  throw new Error('Please define MONGODB_DB environment variable');
}

const options = {}; // Remove deprecated options

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(MONGODB_URI, options);
  clientPromise = client.connect();
}

export async function connectWithRetry(retries = 3): Promise<MongoClient> {
  try {
    const client = await clientPromise;
    return client;
  } catch (error) {
    if (retries > 0) {
      console.log(`MongoDB connection attempt ${4 - retries} failed:`, error);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return connectWithRetry(retries - 1);
    }
    throw error;
  }
}

export async function getDatabase() {
  const client = await connectWithRetry();
  return client.db(MONGODB_DB);
}

export async function createIndexes() {
  try {
    const db = await getDatabase();

    // Sessions collection indexes
    await db.collection('ams-sessions').createIndexes([
      { key: { id: 1 }, name: 'id_index' },
      { key: { academyId: 1 }, name: 'academy_index' },
      { key: { parentSessionId: 1 }, name: 'parent_session_index' },
      { key: { 'assignedPlayers': 1 }, name: 'players_index' },
      { key: { status: 1 }, name: 'status_index' },
      { key: { date: 1 }, name: 'date_index' },
      { key: { isOccurrence: 1 }, name: 'occurrence_index' },
      { key: { academyId: 1, parentSessionId: 1 }, name: 'academy_parent_compound' },
      { key: { academyId: 1, status: 1 }, name: 'academy_status_compound' }
    ]);

    // Player data collection indexes
    await db.collection('ams-player-data').createIndexes([
      { key: { id: 1 }, name: 'id_index' },
      { key: { academyId: 1 }, name: 'academy_index' },
      { key: { name: 'text' }, name: 'name_text' }
    ]);

    // Batches collection indexes
    await db.collection('ams-batches').createIndexes([
      { key: { id: 1 }, name: 'id_index' },
      { key: { academyId: 1 }, name: 'academy_index' },
      { key: { 'players': 1 }, name: 'players_index' }
    ]);

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

export async function getCollection(name: string): Promise<Collection> {
  const db = await getDatabase();
  return db.collection(name);
}

export async function queryCached(key: string, queryFn: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached) return cached;

  const result = await queryFn();
  cache.set(key, result);
  return result;
}

export default clientPromise;
