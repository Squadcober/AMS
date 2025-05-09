import { MongoClient, ObjectId } from 'mongodb'
import clientPromise, { getCollection } from './mongodb'
import type { Academy, Player, User, Session } from '@/types/models'
import { cache } from 'react'

export const getDb = cache(async () => {
  if (typeof window !== 'undefined') {
    throw new Error('Database access not allowed on client side')
  }
  const client = await clientPromise
  return client.db(process.env.MONGODB_DB)
})

// Client-side database utility

export async function getAll(collectionName: string) {
  const response = await fetch(`/api/db/${collectionName}`);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

export async function getById(collectionName: string, id: string) {
  const response = await fetch(`/api/db/${collectionName}/${id}`);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

export async function create(collectionName: string, data: any) {
  const response = await fetch(`/api/db/${collectionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create data');
  return response.json();
}

export async function update(collectionName: string, id: string, data: any) {
  const response = await fetch(`/api/db/${collectionName}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update data');
  return response.json();
}

export async function remove(collectionName: string, id: string) {
  try {
    const response = await fetch(`/api/db/${collectionName}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete data');
    }

    console.log(`Successfully deleted document with ID: ${id} from collection: ${collectionName}`);
    return response.json();
  } catch (error) {
    console.error(`Error deleting document with ID: ${id} from collection: ${collectionName}`, error);
    throw error;
  }
}

export async function getByFilter(collectionName: string, filter: any) {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    params.append(key, String(value));
  });
  
  const response = await fetch(`/api/db/${collectionName}/filter?${params}`);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

// Academy specific operations
export async function createAcademy(academy: Academy) {
  try {
    const response = await fetch('/api/db/ams-academy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(academy),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create academy');
    }

    const result = await response.json();
    return result.data; // Return the created academy data
  } catch (error) {
    console.error('Error creating academy:', error);
    throw error;
  }
}

export async function getAcademies() {
  try {
    const response = await fetch('/api/db/ams-academy');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch academies');
    }
    const result = await response.json();

    // Ensure the response is an array
    if (Array.isArray(result)) {
      return result;
    } else if (result.data && Array.isArray(result.data)) {
      return result.data;
    } else {
      console.error('Unexpected response format:', result);
      return [];
    }
  } catch (error) {
    console.error('Error fetching academies:', error);
    throw error;
  }
}

export async function getAcademyById(id: string) {
  const collection = await getCollection('ams-academy')
  return collection.findOne({ id }) as Promise<Academy | null>
}

// Player specific operations
export async function getPlayers(academyId: string) {
  try {
    const response = await fetch(`/api/db/ams-player-data?academyId=${academyId}`);
    if (!response.ok) throw new Error('Failed to fetch players');
    return response.json();
  } catch (error) {
    console.error('Error fetching players:', error);
    throw error;
  }
}

export async function getPlayerByUserId(username: string) {
  try {
    console.log('Fetching player data for username:', username);
    const response = await fetch(`/api/db/ams-player-data/user/${encodeURIComponent(username)}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch player');
    }
    
    const player = await response.json();
    console.log('Retrieved player data:', player);
    return player;
  } catch (error) {
    console.error('Error fetching player:', error);
    throw error;
  }
}

export async function updatePlayerAttributes(playerId: string, attributes: any) {
  try {
    const response = await fetch(`/api/db/ams-player-data/${playerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributes }),
    });
    if (!response.ok) throw new Error('Failed to update player attributes');
    return response.json();
  } catch (error) {
    console.error('Error updating player attributes:', error);
    throw error;
  }
}

export async function createPlayer(playerData: any) {
  try {
    const response = await fetch('/api/db/ams-player-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playerData),
    });
    if (!response.ok) throw new Error('Failed to create player');
    return response.json();
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
}

// Training data specific operations
export async function getTrainingData(playerId: string) {
  try {
    const response = await fetch(`/api/db/ams-training?playerId=${playerId}`);
    if (!response.ok) throw new Error('Failed to fetch training data');
    return response.json();
  } catch (error) {
    console.error('Error fetching training data:', error);
    throw error;
  }
}

export async function saveTrainingData(data: any) {
  try {
    const response = await fetch('/api/db/ams-training', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save training data');
    return response.json();
  } catch (error) {
    console.error('Error saving training data:', error);
    throw error;
  }
}

// Session specific operations
export async function getSessions(academyId: string) {
  const collection = await getCollection('ams-sessions')
  return collection.find({ academyId }).toArray() as Promise<Session[]>
}

export async function createSession(session: Session) {
  const collection = await getCollection('ams-sessions')
  return collection.insertOne(session)
}

export async function updateSession(id: string, updates: Partial<Session>) {
  const collection = await getCollection('ams-sessions')
  return collection.updateOne(
    { id },
    { $set: updates }
  )
}

// User specific operations
export async function getUsers(academyId: string) {
  const collection = await getCollection('ams-users')
  return collection.find({ academyId }).toArray() as Promise<User[]>
}

export async function getUserByEmail(email: string) {
  const collection = await getCollection('ams-users')
  return collection.findOne({ email }) as Promise<User | null>
}

export async function loginUser(credentials: { username: string; password: string }) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function getCurrentUser(token: string) {
  try {
    const response = await fetch('/api/auth/user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
}
