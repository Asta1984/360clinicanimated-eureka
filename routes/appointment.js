const { Router } = require("express");
const appointmentRouter = Router();
const { AppointmentModel, DoctorModel, PatientModel } = require("../db");
const { patientMiddleware } = require("../middleware/patient");
const { doctorMiddleware } = require("../middleware/doctor");
const mongoose = require('mongoose');
const { z } = require('zod');
const nodemailer = require('nodemailer');

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Appointment Booking Validation Schema
const appointmentBookingSchema = z.object({
    doctorId: z.string(),
    date: z.preprocess((arg) => {
      if (typeof arg === 'string' || arg instanceof Date) {
        return new Date(arg);
      }
    }, z.date()),
    startTime: z.string(),
    endTime: z.string(),
    consultationLocation: z.string()
  });
  
// Helper function to send email
const sendAppointmentEmail = async (patient, doctor, appointment, type) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: patient.email,
            subject: type === 'booking' 
                ? 'Appointment Confirmation' 
                : 'Appointment Cancellation',
            html: type === 'booking' 
                ? `
                    <h1>Appointment Confirmed</h1>
                    <p>Dear ${patient.firstName},</p>
                    <p>Your appointment with Dr. ${doctor.firstName} ${doctor.lastName} has been booked:</p>
                    <ul>
                        <li>Date: ${appointment.date.toLocaleDateString()}</li>
                        <li>Time: ${appointment.startTime} - ${appointment.endTime}</li>
                        <li>Location: ${appointment.consultationLocation}</li>
                    </ul>
                ` 
                : `
                    <h1>Appointment Cancelled</h1>
                    <p>Dear ${patient.firstName},</p>
                    <p>Your appointment with Dr. ${doctor.firstName} ${doctor.lastName} has been cancelled:</p>
                    <ul>
                        <li>Date: ${appointment.date.toLocaleDateString()}</li>
                        <li>Time: ${appointment.startTime} - ${appointment.endTime}</li>
                        <li>Location: ${appointment.consultationLocation}</li>
                    </ul>
                `
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email sending failed:', error);
    }
};

// Book Appointment
appointmentRouter.post('/book', patientMiddleware, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const parsedData = appointmentBookingSchema.safeParse(req.body);
        
        if (!parsedData.success) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: "Invalid input",
                errors: parsedData.error.errors
            });
        }

        const { doctorId, date, startTime, endTime, consultationLocation } = req.body;
        const patientId = req.patientId;

        // Check doctor's availability
        const doctor = await DoctorModel.findById(doctorId);
        if (!doctor) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Check for conflicting appointments
        const existingAppointment = await AppointmentModel.findOne({
            doctorId,
            date,
            $or: [
                { 
                    startTime: { $lt: endTime },
                    endTime: { $gt: startTime }
                }
            ],
            status: { $ne: 'Cancelled' }
        }).session(session);

        if (existingAppointment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({ 
                message: "Appointment slot is already booked" 
            });
        }

        // Create new appointment
        const appointment = await AppointmentModel.create([{
            doctorId,
            patientId,
            date,
            startTime,
            endTime,
            consultationLocation
        }], { session });

        // Fetch patient details for email
        const patient = await PatientModel.findById(patientId);

        // Send confirmation email
        await sendAppointmentEmail(patient, doctor, appointment[0], 'booking');

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            message: "Appointment booked successfully",
            appointmentId: appointment[0]._id
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            message: "Appointment booking failed",
            error: error.message
        });
    }
});

// Cancel Appointment
appointmentRouter.put('/cancel/:appointmentId', patientMiddleware, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { appointmentId } = req.params;
        const patientId = req.patientId;

        // Find appointment with doctor details
        const appointment = await AppointmentModel.findOneAndUpdate(
            { 
                _id: appointmentId, 
                patientId: patientId,
                status: 'Scheduled' 
            },
            { 
                status: 'Cancelled' 
            },
            { new: true }
        ).session(session);

        if (!appointment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                message: "Appointment not found or already cancelled"
            });
        }

        // Fetch patient and doctor details for email
        const patient = await PatientModel.findById(patientId);
        const doctor = await DoctorModel.findById(appointment.doctorId);

        // Send cancellation email
        await sendAppointmentEmail(patient, doctor, appointment, 'cancellation');

        await session.commitTransaction();
        session.endSession();

        res.json({
            message: "Appointment cancelled successfully",
            appointment
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            message: "Appointment cancellation failed",
            error: error.message
        });
    }
});

// Get Patient Appointments
appointmentRouter.get('/patient', patientMiddleware, async (req, res) => {
    try {
        const appointments = await AppointmentModel.find({ 
            patientId: req.patientId 
        }).populate('doctorId', 'firstName lastName specialty');

        res.json({
            appointments,
            count: appointments.length
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve appointments",
            error: error.message
        });
    }
});

// Get Doctor Appointments
appointmentRouter.get('/doctor', doctorMiddleware, async (req, res) => {
    try {
        const appointments = await AppointmentModel.find({ 
            doctorId: req.doctorId 
        }).populate('patientId', 'firstName lastName');

        res.json({
            appointments,
            count: appointments.length
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve appointments",
            error: error.message
        });
    }
});

// Add Doctor Availability Route
appointmentRouter.put('/doctor/availability', doctorMiddleware, async (req, res) => {
    try {
        const { availabilitySlots } = req.body;
        
        const updatedDoctor = await DoctorModel.findByIdAndUpdate(
            req.doctorId,
            { availabilitySlots },
            { new: true }
        );

        if (!updatedDoctor) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.json({
            message: "Availability updated successfully",
            availabilitySlots: updatedDoctor.availabilitySlots
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update availability",
            error: error.message
        });
    }
});

module.exports = {
    appointmentRouter
};