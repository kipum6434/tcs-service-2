import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../common/db';
import { authenticate, requireRole } from '../common/auth.middleware';

const router = Router();
router.use(authenticate);

// GET /api/users — list (for assign dropdown)
router.get('/', async (_req: Request, res: Response) => {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, u.role, d.name AS department
     FROM users u LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.is_active = true ORDER BY u.name`
  );
  res.json(rows);
});

// POST /api/users — create (admin only)
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const { name, email, password, role, department_id } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'Missing required fields' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role, department_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role`,
      [name, email, hash, role, department_id]
    );
    res.status(201).json(rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/departments
router.get('/departments', async (_req: Request, res: Response) => {
  const { rows } = await db.query('SELECT * FROM departments ORDER BY id');
  res.json(rows);
});

export default router;
