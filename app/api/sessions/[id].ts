import { NextApiRequest, NextApiResponse } from 'next'
import { getById, update, remove } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' })
  }

  if (req.method === 'GET') {
    try {
      const session = await getById('sessions', id)
      if (!session) {
        return res.status(404).json({ error: 'Session not found' })
      }
      res.status(200).json(session)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch session' })
    }
  } else if (req.method === 'PUT') {
    try {
      const result = await update('sessions', id, req.body)
      res.status(200).json(result)
    } catch (error) {
      res.status(500).json({ error: 'Failed to update session' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const result = await remove('sessions', id)
      res.status(200).json(result)
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete session' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
