const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'change_this_secret';

    if (process.env.NODE_ENV === 'production' && jwtSecret === 'change_this_secret') {
      return res.status(500).json({ success: false, message: 'JWT secret is not configured' });
    }

    const payload = jwt.verify(token, jwtSecret);
    const user = await prisma.user.findFirst({
      where: { id: payload.id, isActive: true, deletedAt: null },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid authentication token' });
  }
}

module.exports = authMiddleware;
