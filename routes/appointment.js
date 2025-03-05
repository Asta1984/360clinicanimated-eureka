const { Router } = require("express");
const appointmentRouter = Router();
const { AppointmentModel, DoctorModel } = require("../db");
const { patientMiddleware } = require("../middleware/patient");
const { doctorMiddleware } = require("../middleware/doctor");
const mongoose = require('mongoose');
const { z } = require('zod');

// Appointment Booking Validation Schema
const appointmentBookingSchema = z.object({
    doctorId: z.string(),
    date: z.date(),
    startTime: z.string(),
    endTime: z.string(),
    consultationLocation: z.string()
});

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
    try {
        const { appointmentId } = req.params;
        const patientId = req.patientId;

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
        );

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found or already cancelled"
            });
        }

        res.json({
            message: "Appointment cancelled successfully",
            appointment
        });
    } catch (error) {
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

module.exports = {
    appointmentRouter
};