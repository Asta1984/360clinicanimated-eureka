const jwt = require('jsonwebtoken');
const { JWT_DOCTOR_SECRET } = require('../config');

function doctorMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]; // Assuming "Bearer TOKEN"
    if (!token) {
        return res.status(401).json({
            message: "No authentication token provided"
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_DOCTOR_SECRET);
        // Check if the decoded token has a doctor role
        if (decoded.role !== 'doctor') {
            return res.status(403).json({
                message: "Unauthorized: Access restricted to doctors only"
            });
        }
        // Attach the decoded user information to the request object
        req.doctorId = decoded.id;
        req.doctorEmail = decoded.email;
        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: "Invalid authentication token"
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: "Authentication token has expired"
            });
        }

        // Generic error response for other token-related issues
        return res.status(500).json({
            message: "Authentication error",
            error: error.message
        });
    }
}

module.exports = {
    doctorMiddleware
};