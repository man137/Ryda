// pages/api/register/verify-otp.js (NEW FILE - Contains final registration logic)
import bcrypt from 'bcryptjs';
import User from '../../../models/User';
import Driver from '../../../models/Driver';
import TempUser from '../../../models/TempUser';
import { parseForm } from '../../../lib/registerUtils';
import connectDB from '../../../lib/mongodb'
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await connectDB();
    const { fields } = await parseForm(req);
    const { email, otp } = fields; 

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP code are required for verification.' });
    }

    // 1. Find Temporary Record
    const tempUser = await TempUser.findOne({ email });

    if (!tempUser) {
      return res.status(400).json({ message: 'Verification record not found or has expired. Please re-register.' });
    }

    // 2. Check Expiry
    if (new Date() > tempUser.otpExpires) {
      await TempUser.deleteOne({ email }); 
      return res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
    }

    // 3. Verify OTP
    const isMatch = await bcrypt.compare(otp, tempUser.otp);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid OTP code. Please try again.' });
    }
    
    // 4. OTP VERIFIED - Create Final Account
    const userData = tempUser.toObject();
    delete userData._id; 
    delete userData.otp;
    delete userData.otpExpires;
    delete userData.createdAt;

    let newUser;
    
    if (userData.accountType === 'driver') {
      newUser = new Driver({ 
          ...userData,
          status: 'pending_review',
          isVerified: true
      });
    } else {
      userData.name = `${userData.firstName} ${userData.lastName}`;
      userData.provider = 'credentials';
      userData.isVerified = true; 

      newUser = new User(userData);
    }

    await newUser.save();

    // 5. Clean Up
    await TempUser.deleteOne({ email });

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: userData.accountType === 'driver' 
        ? 'Driver verification successful! Your account is pending approval.' 
        : 'Registration successful! You can now log in.',
      user: userResponse,
      accountType: userData.accountType
    });

  } catch (error) {
    console.error('Final Verification/Registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: `A final account with this email already exists` });
    }
    res.status(500).json({ message: 'Internal server error during final registration. Please try again later.' });
  }
}