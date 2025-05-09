"use server"

import { MongoClient, Collection } from 'mongodb';
import { LRUCache } from 'lru-cache';

const CACHE_TTL = 30000; // 30 seconds
const CACHE_SIZE = 100; // Maximum number of cached items

const cache = new LRUCache({
  max: CACHE_SIZE,
  ttl: CACHE_TTL,
  updateAgeOnGet: true,
  allowStale: false
});

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  // Removed directConnection and family for SRV URIs
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (typeof window === 'undefined') {
  if (process.env.NODE_ENV === 'development') {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect()
        .catch(err => {
          console.error('Failed to connect to MongoDB:', err);
          throw err;
        });
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect()
      .catch(err => {
        console.error('Failed to connect to MongoDB:', err);
        throw err;
      });
  }
} else {
  throw new Error('MongoDB client cannot be initialized on the client side');
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
  return client.db(process.env.MONGODB_DB || ''); // Add fallback empty string
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

export async function queryCached<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as T;

  const result = await queryFn();
  cache.set(key, result);
  return result;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || '');
    await db.command({ ping: 1 });
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

export async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }
  if (!process.env.MONGODB_DB) {
    throw new Error('Please define the MONGODB_DB environment variable');
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || '');
    return { client, db };
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw new Error('Unable to connect to database');
  }
}

export async function getClientPromise(): Promise<MongoClient> {
  return clientPromise;
}
