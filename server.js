require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Models
const User = mongoose.model('User', new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['student', 'staff', 'admin'], default: 'student' },
  matricNumber: { type: String, unique: true, sparse: true },
  department: String,
  createdAt: { type: Date, default: Date.now }
}));

const Event = mongoose.model('Event', new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  title: String,
  description: String,
  date: Date,
  time: String,
  location: String,
  organizer: { type: String, ref: 'User' },
  capacity: Number,
  attendees: [{ type: String, ref: 'User' }],
  categories: [String],
  createdAt: { type: Date, default: Date.now }
}));

// Authentication Middleware
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).send('Access denied');

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send('Invalid token');
  }
};

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, matricNumber, department } = req.body;
    
    if (!email || !password) return res.status(400).send('Email and password are required');

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send('Email already registered');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      matricNumber,
      department
    });

    await user.save();

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).send({ user: { 
      id: user.id, 
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email, 
      role: user.role,
      matricNumber: user.matricNumber,
      department: user.department
    }, token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('Invalid credentials');

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send('Invalid credentials');

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.send({ 
      user: { 
        id: user.id, 
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email, 
        role: user.role,
        matricNumber: user.matricNumber,
        department: user.department
      }, 
      token 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/api/events', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'student') {
      return res.status(403).send('Only staff and admins can create events');
    }

    const { title, description, date, time, location, capacity, categories } = req.body;

    const event = new Event({
      title,
      description,
      date: new Date(date),
      time,
      location,
      organizer: req.user.id,
      capacity,
      categories
    });

    await event.save();
    res.status(201).send(event);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find().populate('organizer', 'firstName lastName email');
    res.send(events);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/api/events/:id/register', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).send('Event not found');

    if (event.attendees.includes(req.user.id)) {
      return res.status(400).send('Already registered for this event');
    }

    if (event.attendees.length >= event.capacity) {
      return res.status(400).send('Event is at full capacity');
    }

    event.attendees.push(req.user.id);
    await event.save();

    res.send({ message: 'Successfully registered for event' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/api/user/events', authenticate, async (req, res) => {
  try {
    const events = await Event.find({ attendees: req.user.id });
    res.send(events);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// All other routes should serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
