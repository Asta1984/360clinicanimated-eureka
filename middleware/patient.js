const jwt = require('jsonwebtoken');
const { JWT_PATIENT_SECRET } = require('../config');

function patientMiddleware(req, res, next) {
    // Get the token from the request headers
    const token = req.headers.authorization?.split(' ')[1]; // Assuming "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({
            message: "No authentication token provided"
        });
    }

    try {
        // Verify the token using the patient-specific secret
        const decoded = jwt.verify(token, JWT_PATIENT_SECRET);

        // Check if the decoded token has a patient role
        if (decoded.role !== 'patient') {
            return res.status(403).json({
                message: "Unauthorized: Access restricted to patients only"
            });
        }

        // Attach the decoded user information to the request object
        req.patientId = decoded.id;
        req.patientEmail = decoded.email;

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
    patientMiddleware
};