// pages/api/register/request-otp.js (NEW FILE)
import bcrypt from 'bcryptjs';
import { createTransport } from 'nodemailer';
import User from '../../../models/User';
import Driver from '../../../models/Driver';
import TempUser from '../../../models/TempUser';
import { parseForm, ensureDirectories, saveFile } from '../../../lib/registerUtils';
import connectDB from '../../../lib/mongodb'
// --- Nodemailer Transporter Setup ---
const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to generate and send OTP
const generateAndSendOTP = async (email) => {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const hashedOtp = await bcrypt.hash(otpCode, 12);
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Ryda Email Verification Code',
    html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
             <h2 style="color: #333;">Welcome to Ryda!</h2>
             <p>Your one-time verification code is:</p>
             <p style="font-size: 24px; font-weight: bold; color: #007bff; margin: 20px 0;">${otpCode}</p>
             <p style="font-size: 12px; color: #777;">This code expires in 10 minutes. Do not share it.</p>
           </div>`,
  };

  await transporter.sendMail(mailOptions);
  return { hashedOtp, otpExpires };
};

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  ensureDirectories();

  try {
    await connectDB();
    const { fields, files } = await parseForm(req);
    const userData = fields; 

    // 1. Validation and Existing User Check
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'password', 'accountType'];
    for (const field of requiredFields) {
      if (!userData[field]) return res.status(400).json({ message: `${field} is required` });
    }

    const existingUser = await User.findOne({ email: userData.email });
    const existingDriver = await Driver.findOne({ email: userData.email });
    if (existingUser || existingDriver) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(userData.password, parseInt(process.env.SALT_ROUNDS));
    userData.password = hashedPassword;
    
    // 2. Driver Specific Logic & File Uploads
    let licenseFrontPath = null;
    let licenseBackPath = null;
    
    if (userData.accountType === 'driver') {
        const driverFields = ['driverLicense', 'vehicleModel', 'licensePlate', 'address'];
        for (const field of driverFields) {
            if (!userData[field]) return res.status(400).json({ message: `${field} is required for drivers` });
        }
        
        if (!files.licenseFront || !files.licenseFront[0] || !files.licenseBack || !files.licenseBack[0]) {
            return res.status(400).json({ message: 'Both license images are required for drivers' });
        }
        
        licenseFrontPath = await saveFile(files.licenseFront[0], 'licenses');
        licenseBackPath = await saveFile(files.licenseBack[0], 'licenses');
        
        userData.licenseFront = licenseFrontPath;
        userData.licenseBack = licenseBackPath;
    }
    
    // 3. Generate, Send OTP, and Store Temporarily
    const { hashedOtp, otpExpires } = await generateAndSendOTP(userData.email);
    
    const tempUserData = {
      ...userData,
      otp: hashedOtp,
      otpExpires: otpExpires,
    };

    // Clean up any old pending registration for this email
    await TempUser.deleteOne({ email: userData.email });

    const newTempUser = new TempUser(tempUserData);
    await newTempUser.save();

    res.status(200).json({
      message: `Verification code sent to ${userData.email}. Please check your inbox (and spam folder).`,
      email: userData.email 
    });

  } catch (error) {
    console.error('OTP Request Error:', error);
    res.status(500).json({ message: 'Failed to initiate registration. Please try again.' });
  }
}