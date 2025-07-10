const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

// connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// define User schema
const UserSchema = new Schema({
  username: String,
});
// create User model
const User = mongoose.model('User', UserSchema);

// define Exercise schema
const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
// create Exercise model
const Exercise = mongoose.model('Exercise', ExerciseSchema);

// apply middlewares
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// serve index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// GET all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}).select('_id username');
  if (!users) {
    res.send('No users');
  } else {
    res.json(users);
  }
});

// POST new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const userObj = new User({ username });

  // save user
  try {
    const user = await userObj.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Error saving user' });
  }
});

// POST new exercise for user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res
      .status(400)
      .json({ error: 'Description and duration are required' });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      res.send('Could not find user');
    } else {
      // create new exercise
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date(),
      });

      // save exercise
      const exercise = await exerciseObj.save();

      // respond with exercise and user info
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(),
      });
    }
  } catch (err) {
    console.log(err);
    res.json('There was an error saving the exercise');
  }
});

// GET exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const id = req.params._id;
    const user = await User.findById(id);

    if (!user) {
      res.send('User not found');
      return;
    }

    // create date filter object
    let dateObj = {};

    if (from) {
      dateObj['$gte'] = new Date(from);
    }

    if (to) {
      dateObj['$lte'] = new Date(to);
    }

    let filter = {
      user_id: id,
    };

    // apply date filters if provided
    if (from || to) {
      filter.date = dateObj;
    }

    // limit results
    const safeLimit = Number(limit) > 0 ? Number(limit) : 500;
    const exercises = await Exercise.find(filter).limit(safeLimit);

    // format exercise log
    const log = exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    // respond with log data
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// listen for requests
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
