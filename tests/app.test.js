// tests/app.test.js
jest.setTimeout(15000); // Increase timeout if needed

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app'); // Make sure app.js exports your Express app
const { DoctorModel, PatientModel, AppointmentModel } = require('../db');

describe('360clinicanimated-eureka API Endpoints', () => {
  let doctorToken, patientToken, doctorId, patientId, appointmentId;

  beforeAll(async () => {
    // Optionally connect to a separate test DB here if desired
    // Example: await mongoose.connect(process.env.TEST_DATABASE_URL);
  });

  afterAll(async () => {
    await DoctorModel.deleteMany({});
    await PatientModel.deleteMany({});
    await AppointmentModel.deleteMany({});
    await mongoose.connection.close();
  });

  // -------------------------------
  // Doctor Endpoints Tests
  // -------------------------------
  describe('Doctor Endpoints', () => {
    test('Doctor Signup', async () => {
      const res = await request(app)
        .post('/api/v1/doctors/signup')
        .send({
          email: "doctor@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
          specialty: "Cardiologist",
          experience: 10,
          location: { city: "New York", state: "NY" },
          contactNumber: "1234567890"
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.doctorId).toBeDefined();
      doctorId = res.body.doctorId;
    });

    test('Doctor Signin', async () => {
      const res = await request(app)
        .post('/api/v1/doctors/signin')
        .send({
          email: "doctor@example.com",
          password: "password123"
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      doctorToken = res.body.token;
    });

    test('Get Doctor Profile', async () => {
      const res = await request(app)
        .get('/api/v1/doctors/profile')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe("doctor@example.com");
    });

    test('Update Doctor Profile', async () => {
      const newFirstName = "Jonathan";
      const res = await request(app)
        .put('/api/v1/doctors/profile')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ firstName: newFirstName });
      expect(res.statusCode).toBe(200);
      expect(res.body.doctor.firstName).toBe(newFirstName);
    });

    test('Update Doctor Availability', async () => {
      const availabilitySlots = [
        {
          day: "Monday",
          startTime: "09:00",
          endTime: "12:00",
          consultationLocations: ["Clinic A", "Clinic B"]
        }
      ];
      const res = await request(app)
        .put('/api/v1/appointments/doctor/availability')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ availabilitySlots });
      expect(res.statusCode).toBe(200);
      expect(res.body.availabilitySlots).toBeDefined();
      expect(res.body.availabilitySlots.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------
  // Patient Endpoints Tests
  // -------------------------------
  describe('Patient Endpoints', () => {
    test('Patient Signup', async () => {
      const res = await request(app)
        .post('/api/v1/patients/signup')
        .send({
          email: "patient@example.com",
          password: "password123",
          firstName: "Alice",
          lastName: "Smith"
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.patientId).toBeDefined();
      patientId = res.body.patientId;
    });

    test('Patient Signin', async () => {
      const res = await request(app)
        .post('/api/v1/patients/signin')
        .send({
          email: "patient@example.com",
          password: "password123"
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      patientToken = res.body.token;
    });

    test('Search Doctors', async () => {
      // Query with no filter to retrieve all doctors
      const res = await request(app)
        .get('/api/v1/patients/search-doctors');
      expect(res.statusCode).toBe(200);
      expect(res.body.doctors).toBeInstanceOf(Array);
      // Since a doctor was already signed up, expect at least one result.
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------
  // Auth Endpoints Tests
  // -------------------------------
  describe('Auth Endpoints', () => {
    test('Universal Login for Doctor', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "doctor@example.com",
          password: "password123",
          role: "doctor"
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    test('Universal Login for Patient', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "patient@example.com",
          password: "password123",
          role: "patient"
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    test('Logout (dummy test)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/logout successful/i);
    });
  });

  // -------------------------------
  // Appointment Endpoints Tests
  // -------------------------------
  describe('Appointment Endpoints', () => {
    test('Book an Appointment', async () => {
      // Create a future date string for the appointment
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);
      const res = await request(app)
        .post('/api/v1/appointments/book')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId: doctorId,
          date: appointmentDate.toISOString(),
          startTime: "10:00",
          endTime: "10:30",
          consultationLocation: "Clinic Address"
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.appointmentId).toBeDefined();
      appointmentId = res.body.appointmentId;
    });

    test('Get Patient Appointments', async () => {
      const res = await request(app)
        .get('/api/v1/appointments/patient')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.appointments).toBeInstanceOf(Array);
      // At least one appointment should exist if booking was successful.
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    test('Get Doctor Appointments', async () => {
      const res = await request(app)
        .get('/api/v1/appointments/doctor')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.appointments).toBeInstanceOf(Array);
    });

    test('Cancel an Appointment', async () => {
      const res = await request(app)
        .put(`/api/v1/appointments/cancel/${appointmentId}`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/cancelled successfully/i);
    });
  });
});
