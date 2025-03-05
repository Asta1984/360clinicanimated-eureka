const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create a transporter using SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send appointment confirmation email
const sendAppointmentConfirmationEmail = async (patientEmail, appointmentDetails) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: patientEmail,
      subject: 'Appointment Confirmation',
      html: `
        <h1>Appointment Confirmed</h1>
        <p>Dear Patient,</p>
        <p>Your appointment has been successfully booked:</p>
        <ul>
          <li>Date: ${appointmentDetails.date}</li>
          <li>Time: ${appointmentDetails.startTime} - ${appointmentDetails.endTime}</li>
          <li>Doctor: ${appointmentDetails.doctorName}</li>
          <li>Location: ${appointmentDetails.consultationLocation}</li>
        </ul>
        <p>Thank you for using our service!</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Appointment confirmation email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Error sending appointment confirmation email', { 
      error: error.message, 
      patientEmail 
    });
    throw error;
  }
};

// Send appointment cancellation email
const sendAppointmentCancellationEmail = async (patientEmail, appointmentDetails) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: patientEmail,
      subject: 'Appointment Cancellation',
      html: `
        <h1>Appointment Cancelled</h1>
        <p>Dear Patient,</p>
        <p>Your appointment has been cancelled:</p>
        <ul>
          <li>Date: ${appointmentDetails.date}</li>
          <li>Time: ${appointmentDetails.startTime} - ${appointmentDetails.endTime}</li>
          <li>Doctor: ${appointmentDetails.doctorName}</li>
        </ul>
        <p>If this was not intended, please contact our support.</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Appointment cancellation email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Error sending appointment cancellation email', { 
      error: error.message, 
      patientEmail 
    });
    throw error;
  }
};

module.exports = {
  sendAppointmentConfirmationEmail,
  sendAppointmentCancellationEmail
};