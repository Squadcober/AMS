import { NextApiRequest, NextApiResponse } from 'next'
import { getAll, create, getByFilter } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { academyId } = req.query
      if (academyId) {
        const sessions = await getByFilter('sessions', { academyId })
        return res.status(200).json(sessions)
      }
      const sessions = await getAll('sessions')
      res.status(200).json(sessions)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sessions' })
    }
  } else if (req.method === 'POST') {
    try {
      const result = await create('sessions', req.body)
      res.status(201).json(result)
    } catch (error) {
      res.status(500).json({ error: 'Failed to create session' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
