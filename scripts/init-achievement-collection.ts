import { getClientPromise } from '@/lib/mongodb';

async function initAchievementCollection() {
  try {
    console.log('Connecting to MongoDB...');
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    const collections = await db.listCollections().toArray();
    if (collections.some(col => col.name === 'ams-achievement')) {
      console.log('Collection ams-achievement already exists');
      return;
    }

    // Initialize collection through API
    const response = await fetch('http://localhost:3000/api/db/ams-achievement/init', {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to initialize collection');
    }

    // Add sample achievement
    const sampleAchievement = {
      playerId: 'sample_player_id',
      academyId: 'sample_academy_id',
      title: 'First Tournament Win',
      description: 'Won the regional youth tournament',
      type: 'Tournament',
      date: new Date().toISOString().split('T')[0],
      location: 'City Stadium',
      result: 'Winner',
      position: '1st Place',
      mediaUrls: [],
      isVerified: true,
      verifiedBy: 'coach_id',
      verificationDate: new Date(),
      tags: ['tournament', 'winner']
    };

    await db.collection('ams-achievement').insertOne(sampleAchievement);
    console.log('Added sample achievement');

  } catch (error) {
    console.error('Error initializing achievement collection:', error);
    process.exit(1);
  }
}

initAchievementCollection();
