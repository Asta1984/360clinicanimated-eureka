const { Router } = require("express");
const doctorRouter = Router();
const { DoctorModel } = require("../db");
const { doctorMiddleware } = require("../middleware/doctor");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { z } = require('zod');
const { JWT_DOCTOR_SECRET } = require("../config");

// Doctor Signup Validation Schema
const doctorSignupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(16),
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    specialty: z.enum([
        'Cardiologist', 
        'Dermatologist', 
        'Neurologist', 
        'Pediatrician', 
        'Orthopedic Surgeon', 
        'Gynecologist', 
        'Psychiatrist',
        'Other'
    ]),
    experience: z.number().min(0).max(50),
    location: z.object({
        city: z.string(),
        state: z.string()
    }),
    contactNumber: z.string()
});

// Doctor Signup Route
doctorRouter.post('/signup', async (req, res) => {
    try {
        const parsedData = doctorSignupSchema.safeParse(req.body);
        
        if (!parsedData.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsedData.error.errors
            });
        }

        const { 
            email, 
            password, 
            firstName, 
            lastName, 
            specialty, 
            experience, 
            location, 
            contactNumber 
        } = req.body;

        // Check if doctor already exists
        const existingDoctor = await DoctorModel.findOne({ email });
        if (existingDoctor) {
            return res.status(409).json({
                message: "Doctor already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new doctor
        const doctor = await DoctorModel.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            specialty,
            experience,
            location,
            contactNumber
        });

        res.status(201).json({
            message: "Doctor signup successful",
            doctorId: doctor._id
        });
    } catch (error) {
        res.status(500).json({
            message: "Signup failed",
            error: error.message
        });
    }
});

// Doctor Signin Route
doctorRouter.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find doctor
        const doctor = await DoctorModel.findOne({ email });
        if (!doctor) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, doctor.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { 
                id: doctor._id, 
                email: doctor.email,
                role: 'doctor' 
            }, 
            JWT_DOCTOR_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({
            token,
            doctorId: doctor._id
        });
    } catch (error) {
        res.status(500).json({
            message: "Signin failed",
            error: error.message
        });
    }
});

// Get Doctor Profile
doctorRouter.get('/profile', doctorMiddleware, async (req, res) => {
    try {
        const doctor = await DoctorModel.findById(req.doctorId).select('-password');
        
        if (!doctor) {
            return res.status(404).json({
                message: "Doctor profile not found"
            });
        }

        res.json(doctor);
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve profile",
            error: error.message
        });
    }
});

// Update Doctor Profile
doctorRouter.put('/profile', doctorMiddleware, async (req, res) => {
    try {
        const updateData = req.body;
        
        const updatedDoctor = await DoctorModel.findByIdAndUpdate(
            req.doctorId, 
            updateData, 
            { new: true, select: '-password' }
        );

        if (!updatedDoctor) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.json({
            message: "Profile updated successfully",
            doctor: updatedDoctor
        });
    } catch (error) {
        res.status(500).json({
            message: "Profile update failed",
            error: error.message
        });
    }
});

module.exports = {
    doctorRouter
};