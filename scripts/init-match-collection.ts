import clientPromise from '@/lib/mongodb';

async function initMatchCollection() {
  try {
    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Check if collection exists
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some(col => col.name === 'ams-match-day');

    if (collectionExists) {
      console.log('Collection ams-match-day already exists');
      return;
    }

    console.log('Creating ams-match-day collection...');
    
    // Create collection
    await db.createCollection('ams-match-day', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'date', 'team1', 'team2', 'startTime', 'endTime', 'venue', 'academyId'],
          properties: {
            id: { bsonType: 'string' },
            date: { bsonType: 'string' },
            team1: { bsonType: 'string' },
            team2: { bsonType: 'string' },
            team1Score: { bsonType: ['int', 'null'] },
            team2Score: { bsonType: ['int', 'null'] },
            startTime: { bsonType: 'string' },
            endTime: { bsonType: 'string' },
            venue: { bsonType: 'string' },
            academyId: { bsonType: 'string' },
            tournamentName: { bsonType: ['string', 'null'] },
            format: { bsonType: ['string', 'null'] },
            gameStatus: {
              enum: ['Not Started', 'In Progress', 'Completed', null]
            },
            winner: { bsonType: ['string', 'null'] },
            loser: { bsonType: ['string', 'null'] },
            extraTime: { bsonType: ['int', 'null'] }
          }
        }
      }
    });

    // Create indexes
    await db.collection('ams-match-day').createIndexes([
      { key: { academyId: 1 } },
      { key: { date: 1 } },
      { key: { gameStatus: 1 } }
    ]);

    console.log('Successfully created ams-match-day collection with indexes');

    // Add sample match if needed
    const sampleMatch = {
      id: 'match_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      team1: 'Academy Team',
      team2: 'Opponent Team',
      startTime: '14:00',
      endTime: '16:00',
      venue: 'Main Ground',
      academyId: 'sample_academy_id',
      gameStatus: 'Not Started'
    };

    await db.collection('ams-match-day').insertOne(sampleMatch);
    console.log('Added sample match');

  } catch (error) {
    console.error('Error initializing match collection:', error);
    process.exit(1);
  }
}

initMatchCollection();
