const { Router } = require("express");
const authRouter = Router();
const { z } = require('zod');
const jwt = require("jsonwebtoken");
const { DoctorModel, PatientModel } = require("../db");
const bcrypt = require('bcrypt');
const { JWT_DOCTOR_SECRET, JWT_PATIENT_SECRET } = require("../config");

// Common Login Schema
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(16),
    role: z.enum(['doctor', 'patient'])
});

// Universal Login Route
authRouter.post('/login', async (req, res) => {
    try {
        // Validate input
        const parsedData = loginSchema.safeParse(req.body);
        
        if (!parsedData.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsedData.error.errors
            });
        }

        const { email, password, role } = req.body;

        // Select model based on role
        const Model = role === 'doctor' ? DoctorModel : PatientModel;
        const JWT_SECRET = role === 'doctor' ? JWT_DOCTOR_SECRET : JWT_PATIENT_SECRET;

        // Find user
        const user = await Model.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: `${role.charAt(0).toUpperCase() + role.slice(1)} not found`
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { 
                id: user._id, 
                email: user.email,
                role: role 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({
            token,
            userId: user._id,
            role
        });
    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
});

// Logout Route (Client-side token removal)
authRouter.post('/logout', (req, res) => {
    // On the client-side, remove the token from storage
    res.json({
        message: "Logout successful"
    });
});

module.exports = {
    authRouter
};