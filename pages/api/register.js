// pages/api/register.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../../models/User';
import Driver from '../../models/Driver';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

// Connect to MongoDB - Ryda database
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'Ryda'
    });
    console.log('MongoDB connected to Ryda database');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error('Database connection failed');
  }
};

// Configure API route for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Ensure directories exist
const ensureDirectories = () => {
  const directories = [
    path.join(process.cwd(), 'public', 'uploads'),
    path.join(process.cwd(), 'public', 'licenses'),
    path.join(process.cwd(), 'tmp')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Improved saveFile function
const saveFile = async (file, folder = 'uploads') => {
  if (!file || !file.filepath || !file.originalFilename || !file.mimetype) {
    throw new Error('Invalid file object');
  }

  // Validate file type
  if (!file.mimetype.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  // Validate file size
  const stats = fs.statSync(file.filepath);
  if (stats.size > 5 * 1024 * 1024) {
    throw new Error('File size exceeds 5MB limit');
  }

  const uploadDir = path.join(process.cwd(), 'public', folder);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Sanitize filename
  const sanitizedFilename = file.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}-${sanitizedFilename}`;
  const filePath = path.join(uploadDir, fileName);
  
  try {
    // Use fs.promises for async file operations
    await fs.promises.copyFile(file.filepath, filePath);
    
    // Return the public URL
    return `/${folder}/${fileName}`;
  } catch (error) {
    // Clean up if something went wrong
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
    throw error;
  } finally {
    // Clean up the temporary file
    if (fs.existsSync(file.filepath)) {
      await fs.promises.unlink(file.filepath);
    }
  }
};

// Improved form parsing
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowEmptyFiles: false,
      multiples: false,
      keepExtensions: true,
      uploadDir: path.join(process.cwd(), 'tmp'),
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        // Clean up any uploaded files if there was an error
        if (files) {
          Object.values(files).forEach(file => {
            if (file && file.filepath && fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath);
            }
          });
        }
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Ensure directories exist
  ensureDirectories();

  try {
    await connectDB();
    // Parse the multipart form data
    const { fields, files } = await parseForm(req);
    
    // Extract fields (formidable returns arrays, so get first element)
    const userData = {
      firstName: Array.isArray(fields.firstName) ? fields.firstName[0] : fields.firstName,
      lastName: Array.isArray(fields.lastName) ? fields.lastName[0] : fields.lastName,
      email: Array.isArray(fields.email) ? fields.email[0] : fields.email,
      phone: Array.isArray(fields.phone) ? fields.phone[0] : fields.phone,
      password: Array.isArray(fields.password) ? fields.password[0] : fields.password,
      accountType: Array.isArray(fields.accountType) ? fields.accountType[0] : fields.accountType,
    };

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'password', 'accountType'];
    for (const field of requiredFields) {
      if (!userData[field]) {
        return res.status(400).json({ message: `${field} is required` });
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

  
    if (userData.password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    userData.password = hashedPassword;

    let newUser;
    let userResponse;

    if (userData.accountType === 'driver') {
      // Add driver-specific fields
      userData.driverLicense = Array.isArray(fields.driverLicense) ? fields.driverLicense[0] : fields.driverLicense;
      userData.vehicleModel = Array.isArray(fields.vehicleModel) ? fields.vehicleModel[0] : fields.vehicleModel;
      userData.licensePlate = Array.isArray(fields.licensePlate) ? fields.licensePlate[0] : fields.licensePlate;
      userData.address = Array.isArray(fields.address) ? fields.address[0] : fields.address;

      // Validate driver-specific fields
      const driverFields = ['driverLicense', 'vehicleModel', 'licensePlate', 'address'];
      for (const field of driverFields) {
        if (!userData[field]) {
          return res.status(400).json({ message: `${field} is required for drivers` });
        }
      }

      // Validate license images
      if (!files.licenseFront || !files.licenseFront[0] || !files.licenseBack || !files.licenseBack[0]) {
        return res.status(400).json({ message: 'Both license images are required for drivers' });
      }

      // Check if driver already exists
      const existingDriver = await Driver.findOne({ email: userData.email });
      if (existingDriver) {
        return res.status(400).json({ message: 'Driver with this email already exists' });
      }

      // Handle file uploads for drivers
      try {
        userData.licenseFront = await saveFile(files.licenseFront[0], 'licenses');
        userData.licenseBack = await saveFile(files.licenseBack[0], 'licenses');
      } catch (fileError) {
        console.error('File upload error:', fileError);
        return res.status(500).json({ 
          message: 'Failed to upload license images',
          error: fileError.message 
        });
      }

      // Create new driver
      newUser = new Driver(userData);
      await newUser.save();

      // Remove password from response
      userResponse = newUser.toObject();
      delete userResponse.password;

      console.log(`New driver registered:`, {
        id: newUser._id,
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`
      });

    } else {
      // Handle regular user registration
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Set name field for User model consistency
      userData.name = `${userData.firstName} ${userData.lastName}`;
      userData.provider = 'credentials';

      // Create new user
      newUser = new User(userData);
      await newUser.save();

      // Remove password from response
      userResponse = newUser.toObject();
      delete userResponse.password;

      console.log(`New user registered:`, {
        id: newUser._id,
        email: userData.email,
        name: userData.name
      });
    }

    res.status(201).json({
      message: userData.accountType === 'driver' 
        ? 'Driver registration successful! Your account is pending approval.' 
        : 'Registration successful!',
      user: userResponse,
      accountType: userData.accountType
    });

  } catch (error) {
    console.error('Registration error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `A user with this ${field} already exists` 
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({ 
      message: 'Internal server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}