const authService = require('../services/authService');

async function register(req, res) {
  const data = await authService.register(req.body);
  res.status(201).json({ success: true, message: 'Registered successfully', data });
}

async function login(req, res) {
  const data = await authService.login(req.body);
  res.json({ success: true, message: 'Logged in successfully', data });
}

async function me(req, res) {
  const data = await authService.getMe(req.user.id);
  res.json({ success: true, message: 'Current user', data });
}

async function logout(req, res) {
  res.json({ success: true, message: 'Logged out successfully' });
}

module.exports = { register, login, me, logout };
