const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'school_management_jwt_secret_key_2026_xyz', {
    expiresIn: '30d',
  });
};

module.exports = { generateToken };
