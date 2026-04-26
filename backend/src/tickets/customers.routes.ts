import { Router, Request, Response } from 'express';
import { db } from '../common/db';
import { authenticate } from '../common/auth.middleware';

const router = Router();
router.use(authenticate);

// GET /api/customers
router.get('/', async (req: Request, res: Response) => {
  const search = req.query.search as string;
  const params: unknown[] = [];
  let where = '1=1';
  if (search) { where += ' AND (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)'; params.push(`%${search}%`); }
  const { rows } = await db.query(`SELECT * FROM customers WHERE ${where} ORDER BY name`, params);
  res.json(rows);
});

// POST /api/customers
router.post('/', async (req: Request, res: Response) => {
  const { name, phone, phone2, email, line_id, company } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
  const { rows } = await db.query(
    `INSERT INTO customers (name, phone, phone2, email, line_id, company)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, phone, phone2 || null, email || null, line_id || null, company || null]
  );
  res.status(201).json(rows[0]);
});

// GET /api/customers/:id (with sites + ticket history)
router.get('/:id', async (req: Request, res: Response) => {
  const [cust, sites, tickets] = await Promise.all([
    db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]),
    db.query('SELECT * FROM sites WHERE customer_id = $1 ORDER BY id', [req.params.id]),
    db.query(
      `SELECT t.id, t.ticket_number, t.title, t.status, t.priority, t.created_at, t.due_date
       FROM tickets t WHERE t.customer_id = $1 ORDER BY t.created_at DESC LIMIT 20`,
      [req.params.id]
    ),
  ]);
  if (!cust.rows[0]) return res.status(404).json({ error: 'Customer not found' });
  res.json({ ...cust.rows[0], sites: sites.rows, tickets: tickets.rows });
});

// POST /api/customers/:id/sites
router.post('/:id/sites', async (req: Request, res: Response) => {
  const { address, system_size_kw, inverter_brand, inverter_serial, panel_brand, installation_date } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });
  const { rows } = await db.query(
    `INSERT INTO sites (customer_id, address, system_size_kw, inverter_brand, inverter_serial, panel_brand, installation_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, address, system_size_kw || null, inverter_brand || null,
     inverter_serial || null, panel_brand || null, installation_date || null]
  );
  res.status(201).json(rows[0]);
});

export default router;
