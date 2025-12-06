/**
 * Admin Role Middleware
 * Ensures only admin users can access protected routes
 */

function isAdmin(req, res, next) {
    // Check if user exists on request (set by auth middleware)
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin' && !req.user.is_admin) {
        return res.status(403).json({
            error: 'Admin access required',
            code: 'ADMIN_REQUIRED'
        });
    }

    next();
}

module.exports = { isAdmin };
