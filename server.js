require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

app.use(cors());
app.use(express.static('public'));

// make views folder available
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// log app listening port
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});

// connect to mongodb
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

// create a schema to store users 
const Schema = mongoose.Schema;
const user = new Schema({
  username: String,
  count: Number,
  log: [
    {
      description: String,
      duration: Number,
      date: Date,
    }
  ]
});
// create a model from user schema
const User = mongoose.model("User", user);

// middleware to log to the console for every request
// log format: method path - ip
app.use((req, res, next) => {
  const string = req.method + " " + req.path + " - " + req.ip;
  console.log(string);
  next();
});

// configure express to use body-parser as middleware
// for parsing reqest bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



/********** START OF EXERCISES **********/



/* You can POST to /api/users with form data username to create a new user. The returned response will be an object with username and _id properties. */
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  console.log('username: ' + username);

  const newUser = new User({
    username: username,
    count: 0,
  });
  console.log('newUser: ' + newUser);

  newUser.save((err, data) => {
    if (err) {
      console.log(err, data);
      res.json({ error: 'invalid entry' });
    } else {
      res.json({
        username: username,
        _id: data._id,
      });
    }
  });
});

/* You can make a GET request to /api/users to get an array of all users. Each element in the array is an object containing a user's username and _id. */
app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    if (err) {
      console.err(err);
    } else {
      const resArray = [];
      for (let i = 0; i < users.length; i++) {
        resArray.push({
          username: users[i].username,
          _id: users[i]._id,
        });
      }
      return res.json(resArray);
    }
  });
});

/* You can POST to /api/users/:_id/exercises with form data description, duration, and optionally date. If no date is supplied, the current date will be used. The response returned will be the user object with the exercise fields added. */
app.post('/api/users/:_id/exercises', (req, res) => {
  console.log('got body: ', req.body);
  const { description, duration, date } = req.body;
  const { _id } = req.params;
  console.log('exercise data submitted: ', _id, description, duration, date);

  // checks for empty date string and changes to current date if empty
  let fixedDate;
  if (date === '' || typeof req.body.date === 'undefined') {
    fixedDate = new Date();
  } else {
    fixedDate = new Date(Date.parse(date));
  }
  console.log('fixedDate: ', fixedDate);

  const exerciseToAdd = {
    description: description,
    duration: +duration,
    date: fixedDate,
  };

  User.findById(_id, (err, userFound) => {
    if (err) return console.log(err, userFound);

    // increase count by 1 and push object of new exercise onto user's log
    console.log('userFound.count: ' + userFound.count);
    userFound.count++;
    userFound.log.push(exerciseToAdd);

    userFound.save((err, updatedUser) => {
      if (err) return console.log(err);
      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        date: fixedDate.toDateString(),
        duration: +duration,
        description: description,
      });
    });
  });
});

/* You can make a GET request to /api/users/:_id/logs to retrieve a full exercise log of any user. The returned response will be the user object with a log array of all the exercises added. Each log item has the description, duration, and date properties. */
/* You can add from, to and limit parameters to a /api/users/:_id/logs request to retrieve part of the log of any user. from and to are dates in yyyy-mm-dd format. limit is an integer of how many logs to send back. */
app.get("/api/users/:_id/logs", (req, res) => {
  User.findById(req.params._id, (err, userFound) => {
    if (err) return console.log(err);

    if (req.query.limit) {
      userFound.log = userFound.log.slice(0, req.query.limit);
    }

    if (req.query.from || req.query.to) {
      let fromDate = new Date(0);
      let toDate = new Date();
      
      if (req.query.from) {
        fromDate = new Date(req.query.from);
      }
      if (req.query.to) {
        toDate = new Date(req.query.to);
      }

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      userFound.log = userFound.log.filter((session) => {
        let sessionDate = new Date(session.date).getTime();
        
        return sessionDate >= fromDate && sessionDate <= toDate;
      })
    }  

    res.header('Content-Type', 'application/json');
    res.send(JSON.stringify(userFound, null, 4));
  });
});