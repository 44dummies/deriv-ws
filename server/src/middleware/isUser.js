/**
 * User Role Middleware
 * Ensures authenticated users can access user routes
 * Both regular users and admins can access user routes
 */

function isUser(req, res, next) {
    // Check if user exists on request (set by auth middleware)
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    // Both users and admins can access user routes
    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(req.user.role) && !req.user.is_admin) {
        return res.status(403).json({
            error: 'User access required',
            code: 'USER_REQUIRED'
        });
    }

    next();
}

module.exports = { isUser };
