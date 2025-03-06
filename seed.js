// seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { DoctorModel, PatientModel, AppointmentModel } = require('./db');

const dummyDoctors = [
  {
    email: 'doctor1@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    specialty: 'Cardiologist',
    experience: 15,
    location: { city: 'New York', state: 'NY' },
    contactNumber: '1234567890',
    availabilitySlots: [
      { day: 'Monday', startTime: '09:00', endTime: '17:00', consultationLocations: ['Clinic A'] }
    ]
  },
  {
    email: 'doctor2@example.com',
    password: 'password123',
    firstName: 'Emily',
    lastName: 'Smith',
    specialty: 'Dermatologist',
    experience: 10,
    location: { city: 'Los Angeles', state: 'CA' },
    contactNumber: '9876543210',
    availabilitySlots: [
      { day: 'Tuesday', startTime: '10:00', endTime: '18:00', consultationLocations: ['Clinic B'] }
    ]
  },
  {
    email: 'doctor3@example.com',
    password: 'password123',
    firstName: 'Michael',
    lastName: 'Brown',
    specialty: 'Neurologist',
    experience: 12,
    location: { city: 'Chicago', state: 'IL' },
    contactNumber: '5555555555',
    availabilitySlots: [
      { day: 'Wednesday', startTime: '08:00', endTime: '16:00', consultationLocations: ['Clinic C'] }
    ]
  },
  {
    email: 'doctor4@example.com',
    password: 'password123',
    firstName: 'Sarah',
    lastName: 'Wilson',
    specialty: 'Pediatrician',
    experience: 8,
    location: { city: 'Houston', state: 'TX' },
    contactNumber: '4444444444',
    availabilitySlots: [
      { day: 'Thursday', startTime: '07:00', endTime: '15:00', consultationLocations: ['Clinic D'] }
    ]
  },
  {
    email: 'doctor5@example.com',
    password: 'password123',
    firstName: 'David',
    lastName: 'Lee',
    specialty: 'Orthopedic Surgeon',
    experience: 20,
    location: { city: 'San Francisco', state: 'CA' },
    contactNumber: '3333333333',
    availabilitySlots: [
      { day: 'Friday', startTime: '10:00', endTime: '18:00', consultationLocations: ['Clinic E'] }
    ]
  }
];

const dummyPatients = [
  {
    email: 'patient1@example.com',
    password: 'password123',
    firstName: 'Alice',
    lastName: 'Brown',
    dateOfBirth: new Date(1990, 5, 15),
    contactNumber: '5551234567'
  },
  {
    email: 'patient2@example.com',
    password: 'password123',
    firstName: 'Bob',
    lastName: 'Green',
    dateOfBirth: new Date(1985, 10, 20),
    contactNumber: '5559876543'
  },
  {
    email: 'patient3@example.com',
    password: 'password123',
    firstName: 'Charlie',
    lastName: 'Black',
    dateOfBirth: new Date(1978, 3, 10),
    contactNumber: '5550001111'
  },
  {
    email: 'patient4@example.com',
    password: 'password123',
    firstName: 'Diana',
    lastName: 'White',
    dateOfBirth: new Date(1995, 8, 25),
    contactNumber: '5552223333'
  }
];

async function seedDB() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected to MongoDB for seeding.');

    // Hash passwords for doctors and patients
    for (let doctor of dummyDoctors) {
      doctor.password = await bcrypt.hash(doctor.password, 10);
    }
    for (let patient of dummyPatients) {
      patient.password = await bcrypt.hash(patient.password, 10);
    }

    // Insert doctors and patients
    const createdDoctors = await DoctorModel.insertMany(dummyDoctors);
    const createdPatients = await PatientModel.insertMany(dummyPatients);

    console.log('Seeded doctors and patients.');

    // Create dummy appointments.
    // We'll create at least two appointments per doctor using different patients.
    const appointments = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const twoDaysLater = new Date(tomorrow);
    twoDaysLater.setDate(tomorrow.getDate() + 1);

    // For each doctor, create two appointments (if possible)
    for (let i = 0; i < createdDoctors.length; i++) {
      // Use patients in a round-robin fashion.
      const patient1 = createdPatients[i % createdPatients.length];
      const patient2 = createdPatients[(i + 1) % createdPatients.length];

      appointments.push({
        doctorId: createdDoctors[i]._id,
        patientId: patient1._id,
        date: tomorrow,
        startTime: "10:00",
        endTime: "10:30",
        consultationLocation: createdDoctors[i].availabilitySlots[0].consultationLocations[0],
        status: 'Scheduled'
      });

      appointments.push({
        doctorId: createdDoctors[i]._id,
        patientId: patient2._id,
        date: twoDaysLater,
        startTime: "11:00",
        endTime: "11:30",
        consultationLocation: createdDoctors[i].availabilitySlots[0].consultationLocations[0],
        status: 'Scheduled'
      });
    }

    await AppointmentModel.insertMany(appointments);
    console.log('Seeded appointments.');

    console.log('Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDB();
