const { Router } = require("express");
const patientRouter = Router();
const { PatientModel, DoctorModel } = require("../db");
const { patientMiddleware } = require("../middleware/patient");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { z } = require('zod');
const { JWT_PATIENT_SECRET } = require("../config");

// Patient Signup Validation Schema
const patientSignupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(16),
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    dateOfBirth: z.coerce.date().optional(),
    contactNumber: z.string().optional()
});

// Patient Signup Route
patientRouter.post('/signup', async (req, res) => {
    try {
        const parsedData = patientSignupSchema.safeParse(req.body);
        
        if (!parsedData.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsedData.error.errors
            });
        }

        const { email, password, firstName, lastName, dateOfBirth, contactNumber } = req.body;

        // Check if patient already exists
        const existingPatient = await PatientModel.findOne({ email });
        if (existingPatient) {
            return res.status(409).json({
                message: "Patient already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new patient
        const patient = await PatientModel.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            dateOfBirth,
            contactNumber
        });

        res.status(201).json({
            message: "Patient signup successful",
            patientId: patient._id
        });
    } catch (error) {
        res.status(500).json({
            message: "Signup failed",
            error: error.message
        });
    }
});

// Patient Signin Route
patientRouter.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find patient
        const patient = await PatientModel.findOne({ email });
        if (!patient) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, patient.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { 
                id: patient._id, 
                email: patient.email,
                role: 'patient' 
            }, 
            JWT_PATIENT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({
            token,
            patientId: patient._id
        });
    } catch (error) {
        res.status(500).json({
            message: "Signin failed",
            error: error.message
        });
    }
});

// Search Doctors
patientRouter.get('/search-doctors', async (req, res) => {
    try {
        const { specialty, city, state, name } = req.query;

        // Build search query
        const query = {};
        if (specialty) query.specialty = specialty;
        if (city) query['location.city'] = city;
        if (state) query['location.state'] = state;
        if (name) {
            query.$or = [
                { firstName: { $regex: name, $options: 'i' } },
                { lastName: { $regex: name, $options: 'i' } }
            ];
        }

        const doctors = await DoctorModel.find(query).select('-password');

        res.json({
            doctors,
            count: doctors.length
        });
    } catch (error) {
        res.status(500).json({
            message: "Doctor search failed",
            error: error.message
        });
    }
});

// Get Patient Profile 
patientRouter.get('/profile', patientMiddleware, async (req, res) => {
    try {
        const patient = await PatientModel.findById(req.patientId).select('-password');
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch profile",
            error: error.message
        });
    }
});

module.exports = {
    patientRouter
};
