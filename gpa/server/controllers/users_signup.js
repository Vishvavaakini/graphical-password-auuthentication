import { usertModel as User } from '../models/user.js';
import bcrypt from 'bcryptjs';
import { commons, signup_messages as msg } from '../static/message.js';
import jwt from 'jsonwebtoken';
import { userAttemptsModel } from '../models/user_attempts.js';

const signup = async (req, res, next) => {
    let token;
    let existingUser;
    let hashedPassword;
    let createdUser;
    let attempts;

    var { username, email, password, pattern, sets } = req.body;
    username = username.toLowerCase();

    if (typeof sets === 'undefined' || typeof username === 'undefined' || typeof email === 'undefined' || typeof password === 'undefined' || typeof pattern === 'undefined') {
        res.status(406).json({
            message: commons.invalid_params,
            format: msg.format,
        });
        return;
    }

    try {
        existingUser = await User.findOne({ email: email });
    } catch (err) {
        console.error('Error fetching user from database:', err);
        res.status(500).json({ message: msg.db_user_failed });
        return next();
    }

    if (existingUser) {
        res.status(500).json({ message: msg.user_already_exist });
        return next();
    }

    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        console.error('Error hashing password:', err);
        res.status(500).json({ message: msg.pass_hash_err });
        return next();
    }

    createdUser = new User({
        username,
        email,
        password: hashedPassword,
        sets,
        pattern,
        sequence: false,
    });

    attempts = new userAttemptsModel({
        username,
        email,
        attempts: 0,
    });

    try {
        await createdUser.save();
        console.log('User created successfully.');
        console.log('Database:', createdUser.db.name);
        console.log('Collection:', createdUser.collection.name);
        console.log('Inserted User Data:', createdUser);
    } catch (err) {
        console.error('Error saving user to database:', err);
        res.status(500).json({ message: msg.db_save_err });
        return next();
    }

    try {
        await attempts.save();
        console.log('User attempts initialized successfully.');
        console.log('Database:', attempts.db.name);
        console.log('Collection:', attempts.collection.name);
        console.log('Inserted Attempts Data:', attempts);
    } catch (err) {
        console.error('Error saving user attempts to database:', err);
        res.status(500).json({ message: msg.db_save_err });
        return next();
    }

    try {
        token = jwt.sign({ userId: createdUser.id, email: createdUser.email }, process.env.TOKEN_KEY);
    } catch (err) {
        console.error('Error generating token:', err);
        res.status(500).json({ message: commons.token_failed });
        return next();
    }

    res.status(200).json({
        username: createdUser.username,
        userId: createdUser.id,
        email: createdUser.email,
        token: token,
    });
};

export { signup as signupController };
