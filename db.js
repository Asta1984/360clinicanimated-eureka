const { Schema, default: mongoose } = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const dotenv = require('dotenv');

dotenv.config();

// Connect to MongoDB without deprecated options
mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB connection error:', error));

// Doctor Schema
const doctorSchema = new Schema({
    email: { 
        type: String, 
        unique: true, 
        required: true,
        lowercase: true,
        trim: true
    },
    password: { 
        type: String, 
        required: true 
    },
    firstName: { 
        type: String, 
        required: true 
    },
    lastName: { 
        type: String, 
        required: true 
    },
    specialty: { 
        type: String, 
        required: true,
        enum: [
            'Cardiologist', 
            'Dermatologist', 
            'Neurologist', 
            'Pediatrician', 
            'Orthopedic Surgeon', 
            'Gynecologist', 
            'Psychiatrist',
            'Other'
        ]
    },
    experience: { 
        type: Number, 
        min: 0, 
        max: 50 
    },
    location: {
        city: { type: String, required: true },
        state: { type: String, required: true }
    },
    contactNumber: { 
        type: String, 
        required: true 
    },
    availabilitySlots: [{
        day: { 
            type: String, 
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] 
        },
        startTime: { type: String },
        endTime: { type: String },
        consultationLocations: [{ type: String }]
    }],
    isVerified: {
        type: Boolean,
        default: false
    },
    profilePicture: {
        type: String,
        default: null
    }
}, { 
    timestamps: true,
    // Remove any additional index configurations
});

// Add specific indexes
doctorSchema.index({ email: 1 });
doctorSchema.index({ specialty: 1, 'location.city': 1, 'location.state': 1 });

// Patient Schema
const patientSchema = new Schema({
    email: { 
        type: String, 
        unique: true, 
        required: true,
        lowercase: true,
        trim: true
    },
    password: { 
        type: String, 
        required: true 
    },
    firstName: { 
        type: String, 
        required: true 
    },
    lastName: { 
        type: String, 
        required: true 
    },
    dateOfBirth: { 
        type: Date 
    },
    contactNumber: { 
        type: String 
    },
    address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String }
    },
    medicalHistory: [{
        condition: { type: String },
        diagnosedDate: { type: Date }
    }],
    profilePicture: {
        type: String,
        default: null
    }
}, { timestamps: true });

// Add specific indexes
patientSchema.index({ email: 1 });

// Appointment Schema
const appointmentSchema = new Schema({
    doctorId: { 
        type: ObjectId, 
        ref: 'Doctor', 
        required: true 
    },
    patientId: { 
        type: ObjectId, 
        ref: 'Patient', 
        required: true 
    },
    date: { 
        type: Date, 
        required: true 
    },
    startTime: { 
        type: String, 
        required: true 
    },
    endTime: { 
        type: String, 
        required: true 
    },
    consultationLocation: { 
        type: String, 
        required: true 
    },
    status: {
        type: String,
        enum: ['Scheduled', 'Completed', 'Cancelled'],
        default: 'Scheduled'
    },
    notes: {
        type: String,
        maxlength: 500
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Refunded'],
        default: 'Pending'
    }
}, { 
    timestamps: true,
    optimisticConcurrency: true 
});

// Add specific indexes
appointmentSchema.index({ doctorId: 1, date: 1, status: 1 });
appointmentSchema.index({ patientId: 1, date: 1, status: 1 });

// Model Creation
const DoctorModel = mongoose.model("Doctor", doctorSchema);
const PatientModel = mongoose.model("Patient", patientSchema);
const AppointmentModel = mongoose.model("Appointment", appointmentSchema);

// Global connection event listeners
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

// Exporting Models
module.exports = {
    DoctorModel,
    PatientModel,
    AppointmentModel
};