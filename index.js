const express = require("express")
const app = express()
const cors = require("cors")
require("dotenv").config()

const bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({ extended: false }))

app.use(cors())
app.use(express.static("public"))
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html")
})

const mongoose = require("mongoose")
mongoose.connect(process.env.MONGO_URI)

const UserSchema = new mongoose.Schema({
  username: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
})

const User = mongoose.model("User", UserSchema, "user")

const ExerciseSchema = new mongoose.Schema({
  description: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  duration: {
    type: mongoose.Schema.Types.Number,
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: mongoose.Schema.Types.Date,
    required: true,
  },
})

const Exercise = mongoose.model("Exercise", ExerciseSchema, "exercise")

app
  .route("/api/users")
  .post(async function (req, res) {
    try {
      const username = req.body.username

      if (!username) {
        res.status(400).json({ error: "invalid username" })
      }

      const user = await User.create({ username })

      res.json(user.toObject())
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
  .get(async function (req, res) {
    try {
      const users = await User.find()

      res.json(users)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

app.route("/api/users/:id/exercises").post(async function (req, res) {
  try {
    const user_id = req.params.id
    const description = req.body.description
    const duration = parseInt(req.body.duration)
    const date = req.body.date

    const user = await User.findById(user_id)
    if (!user) {
      return res.status(400).json({ error: "invalid user" })
    }

    if (!description || !duration) {
      return res.status(400).json({ error: "invalid payload" })
    }

    const exercise = await Exercise.create({
      user_id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    })

    const result = {
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id,
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.route("/api/users/:id/logs").get(async function (req, res) {
  try {
    const user_id = req.params.id
    const from = req.query.from
    const to = req.query.to
    const limit = parseInt(req.query.limit)

    const user = await User.findById(user_id)
    if (!user) {
      return res.status(400).json({ error: "invalid user" })
    }

    const exercises = await Exercise.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
          ...(from && { date: { $gte: new Date(from) } }),
          ...(to && { date: { $lte: new Date(to) } }),
        },
      },
      ...(limit ? [{ $limit: limit }] : []),
    ])

    const result = {
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map((exercise) => ({
        ...exercise,
        date: exercise.date.toDateString(),
      })),
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port)
})
