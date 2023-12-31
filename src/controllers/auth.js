// Core imports
const crypto = require("crypto");
// Npm imports
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

// Model imports
const User = require("../models/userModel.js");

//Utils imports
const { next500error } = require("../utils/next500error.js");

exports.getWakeup = async (req, res, next) => {
  return res.status(200).json({ message: "Server started" });
};

exports.postSignup = async (req, res, next) => {
  const { name, email, password, confirmPassword } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorObj = {};
    errors.array().forEach((i) => (errorObj[i.path] = i.msg));
    return res.status(422).json(errorObj);
  }

  try {
    const user = await User.findOne({ email: email });
    if (user) {
      return res
        .status(409)
        .json({ error: "Email already registered. Use other email." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      balance: 0,
      movements: [],
    });

    const token = jwt.sign(
      { userId: newUser._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    );
    newUser.token = token;

    await newUser.save();
    return res.status(201).json({ message: "User created", user: { token } });
  } catch (error) {
    next500error(next, error);
  }
};

exports.postLogin = async (req, res, next) => {
  const { email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorObj = {};
    errors.array().forEach((i) => (errorObj[i.path] = i.msg));
    return res.status(422).json(errorObj);
  }

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ email: "Email not registered." });
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);
    if (!passwordsMatch) {
      return res
        .status(401)
        .json({ password: "Invalid email and/or password" });
    }

    const token = jwt.sign({ userId: user._id, email }, process.env.TOKEN_KEY, {
      expiresIn: "2h",
    });

    user.token = token;

    return res.status(200).json({
      message: "Successfully logged in.",
      user: { token },
    });
  } catch (error) {
    next500error(next, error);
  }
};

exports.postLogout = (req, res, next) => {
  if (req.session.user) {
    const userEmail = req.session.user.email;
    req.session.destroy();
    return res
      .status(200)
      .json({ message: "Successfully Logged Out", user: userEmail });
  }
  return res
    .status(401)
    .json({ error: "Can't log out when you aren't logged in." });
};
