const jwt = require('jsonwebtoken');
const { createError } = require('../utils/error');
const User = require('../models/userModel');

exports.authenticateUser = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(createError(401, 'Please provide a valid authentication token'));
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return next(createError(401, 'Please login to access this resource'));
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return next(createError(401, 'User not found'));
            }

            req.user = user;
            next();
        } catch (err) {
            if (err.name === 'JsonWebTokenError') {
                return next(createError(401, 'Invalid token'));
            }
            if (err.name === 'TokenExpiredError') {
                return next(createError(401, 'Token has expired'));
            }
            throw err;
        }
    } catch (error) {
        console.error('Auth Error:', error);
        next(createError(401, 'Authentication failed'));
    }
};

exports.authorizeRoles = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(createError(401, 'Authentication required'));
        }

        if (!req.user.role) {
            return next(createError(403, 'User role not defined'));
        }

        if (!roles.includes(req.user.role)) {
            return next(createError(403, `Access denied. ${req.user.role} role is not authorized to access this resource`));
        }

        next();
    };
}; 