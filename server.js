const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const canvas = require('canvas')
require('dotenv').config();
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const dbFileName = 'your_database_file.db';
let db;

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');

dotenv.config();

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const accessToken = process.env.EMOJI_API_KEY;
const app = express();
const PORT = 3000;
const path = require('path');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

app.use(
    session({
        secret: 'oneringtorulethemall',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    })
);


app.get('/auth/google', (req, res) => {
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    });
    res.redirect(url);
});


app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({
        auth: client,
        version: 'v2',
    });

    const userinfo = await oauth2.userinfo.get();
    const googleId = userinfo.data.id; // Get Google ID
    const hashGoogleId = hashCode(googleId);
    
    // Check if the Google ID is already associated with a user in your database
    const existingUser = await findUserByGoogleId(hashGoogleId);
    if (existingUser) {
        // User already exists, set user ID in session
        req.session.userId = existingUser.hashedGoogleId;
        req.session.loggedIn = true;
        res.redirect('/profile');
    } else {
        // User doesn't exist, redirect to register
        res.redirect('/register');
    }
});


passport.use(new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}/auth/google/callback`
}, (token, tokenSecret, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifCond:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifCond value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifCond}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

// Set up Handlebars view engine with custom helpers
//
app.engine(
    'handlebars',
    expressHandlebars.engine({
        helpers: {
            toLowerCase: function (str) {
                return str.toLowerCase();
            },
            ifCond: function (v1, v2, options) {
                if (v1 === v2) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
            eq: function(a, b) {
                return a === b;
            }
        },
    })
);

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'Yapper';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Yap';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    next();
});

//app.use(express.static('public'));                  // Serve static files
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//
app.get('/', async (req, res) => {
    const sortOption = 'time-desc';
    const posts = await getPosts(sortOption);
    const user = await getCurrentUser(req);
    res.render('home', { posts, user });
});

app.post('/sort', async (req, res) => {
    const sortOption = req.body['sort-options'];
    const posts = await getPosts(sortOption);
    const user = await getCurrentUser(req);
    res.render('home', { posts, user });
});

// Register GET route is used for error response from registration
//
app.get('/register', async (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement

app.get('/emojis', (req, res) => {
    fetch(`https://emoji-api.com/emojis?access_key=${accessToken}`)
    .then(statusCheck)
    .then(response => res.json(response))
    .catch(error => res.type("text").statusCode(404).send(error));
});

app.post('/posts', async (req, res) => {
    await addPost(req.body.title, req.body.content, req.body.username);
    res.redirect('/');
});
app.post('/like/:id', async (req, res) => {
    await updatePostLikes(req, res);
});
app.post('/dislike/:id', async (req, res) => {
    await updatePostDislikes(req, res);
});
app.get('/profile', isAuthenticated, async (req, res) => {
    await renderProfile(req, res);
});
app.get('/avatar/:username', (req, res) => {
    handleAvatar(req, res);
});
app.post('/register', async (req, res) => {
    await registerUser(req, res);
});
app.post('/login', async (req, res) => {
    await loginUser(req, res);
});
app.get('/logout', (req, res) => {
    logoutUser(req, res);
});
app.post('/delete/:id', isAuthenticated, (req, res) => {
    deletePost(req, res);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Ensure the database is initialized before starting the server.
initializeDB().then(() => {
    console.log('Database initialized. Server starting...');
    app.listen(3000, () => {
        console.log('Server running on http://localhost:3000');
    });
}).catch(err => {
    console.error('Failed to initialize the database:', err);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Function to find a user by username
async function findUserByUsername(username) {
    const usernameFromDB = await db.get(`SELECT * FROM users WHERE username = '${username}'`);
    if (usernameFromDB) {
        return usernameFromDB;
    }
    return undefined;
}

// Function to find a user by user ID
async function findUserById(userId) {
    // const userIdFromDB = await db.get(`SELECT * FROM users WHERE hashedGoogleId = '${userId}'`);
    const userIdFromDB = await db.get('SELECT * FROM users WHERE hashedGoogleId = ?', [userId]);
    if (userIdFromDB) {
        return userIdFromDB;
    }
    return undefined;
}

// Function to find a user by Google ID
async function findUserByGoogleId(hashGoogleId) {
    const user = await db.get('SELECT * FROM users WHERE hashedGoogleId = ?', [hashGoogleId]);
    return user;
}

// Function to add a new user
async function addUser(username) {
    const oauth2 = google.oauth2({
        auth:client,
        version:'v2',
    });
    const userinfo =await oauth2.userinfo.get();
    const googleId=userinfo.data.id;
    
    const hashGoogleId = hashCode(googleId);

    await db.run(
        'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
        [username, hashGoogleId, undefined, getCurTime()]
    );
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
async function registerUser(req, res) {
    const username = req.body.username;
    console.log('Attempting to register:', username);
    if (await findUserByUsername(username)) {
        res.redirect('/register?error=Username+already+exists');
    } else {
        await addUser(username);
        const newUser = await findUserByUsername(username);
        if (newUser) {
            req.session.userId = newUser.hashedGoogleId;
            req.session.loggedIn = true;
            res.redirect('/');
        } else {
            res.redirect('/login?error=Invalid+username');
        }
    }
}

// Function to login a user
async function loginUser(req, res) {
    const username = req.body.username;
    const user = await findUserByUsername(username);

    if (user) {
        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.redirect('/login?error=Invalid+username');
    }
}

// Function to logout a user
function logoutUser(req, res) {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            res.redirect('/error');
        } else {
            res.redirect('/');
        }
    });
}

// Function to render the profile page
async function renderProfile(req, res) {
    const user = await getCurrentUser(req);
    const userPosts = await db.all(`SELECT * FROM posts WHERE username = '${user.username}'`);
    const numLikes = userLifetimeLikeCount(userPosts);
    res.render('profile', {userPosts, user, numLikes});
}

function userLifetimeLikeCount(userPosts) {
    let numLikes = 0;
    for (let i = 0; i < userPosts.length; i++) {
        numLikes += userPosts[i].likes;
    }
    return numLikes;
}

// Function to update post likes
async function updatePostLikes(req, res) {
    const postId = parseInt(req.params.id);
    const curUser = await getCurrentUser(req);
    if (curUser) {
        // if user is logged in
        await db.run(`UPDATE posts SET likes = likes + 1 WHERE id = ${postId}`);
    }
    // send response w/ numLikes
    const likes = await db.get(`SELECT likes FROM posts WHERE id = ${postId}`);
    res.json(likes);
}

async function updatePostDislikes(req, res) {
    const postId = parseInt(req.params.id);
    const curUser = await getCurrentUser(req);
    if (curUser) {
        // if user is logged in
        await db.run(`UPDATE posts SET likes = likes - 1 WHERE id = ${postId}`);
    }
    // send response w/ numLikes
    const likes = await db.get(`SELECT likes FROM posts WHERE id = ${postId}`);
    res.json(likes);
}

// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    let username = req.params.username;
    res.send(generateAvatar(username[0]));
}

// Function to get the current user from session
async function getCurrentUser(req) {
    return await findUserById(req.session.userId);
}

// Function to get all posts, sorted by latest first
async function getPosts(option) {
    const dict = {
        'time-desc': 'timestamp DESC',
        'time-asc': 'timestamp ASC',
        'title-desc': 'title DESC',
        'title-asc': 'title ASC',
        'likes-desc': 'likes DESC',
        'likes-asc': 'likes ASC'
    };
    return await db.all(`SELECT * FROM posts ORDER BY ${dict[option]}`);
}

// Function to add a new post
async function addPost(title, content, user) {
    await db.run(
        'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
        [title, content, user, getCurTime(), 0]
    );
}

async function deletePost(req, res) {
    const postId = parseInt(req.params.id);
    const curPost = await db.get(`SELECT * FROM posts WHERE id = ${postId}`);
    const curPostUser = await findUserByUsername(curPost.username);
    const curUser = await getCurrentUser(req);
    if (curPostUser.id === curUser.id) {
        // post exist and the current user is owner
        await db.run(`DELETE FROM posts WHERE id = ${postId}`);
        res.json({success: true});
    }
}

// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
    // Steps:
    // 1. Choose a color scheme based on the letter
    // 2. Create a canvas with the specified width and height
    // 3. Draw the background color
    // 4. Draw the letter in the center
    // 5. Return the avatar as a PNG buffer
    const myCanvas = new canvas.Canvas(width, height);
    const ctx = myCanvas.getContext('2d');
    const upperCaseLetter = letter.toUpperCase();

    // Choose a random color for the background
    // const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);

    // chat-gpt generated
    const backgroundColors = {
        A: '#FF5733', // Red
        B: '#33FF57', // Green
        C: '#3357FF', // Blue
        D: '#FF33A1', // Pink
        E: '#A133FF', // Purple
        F: '#FF8C33', // Orange
        G: '#33FFF3', // Aqua
        H: '#5733FF', // Indigo
        I: '#FF3333', // Bright Red
        J: '#33FF8C', // Lime
        K: '#33A1FF', // Sky Blue
        L: '#FF33F3', // Magenta
        M: '#FFB833', // Gold
        N: '#33FFB8', // Light Green
        O: '#5733A1', // Dark Purple
        P: '#FF338C', // Deep Pink
        Q: '#8C33FF', // Violet
        R: '#FF5733', // Tomato
        S: '#33FF57', // Spring Green
        T: '#3357FF', // Dodger Blue
        U: '#FF33A1', // Hot Pink
        V: '#A133FF', // Medium Purple
        W: '#FF8C33', // Dark Orange
        X: '#33FFF3', // Cyan
        Y: '#5733FF', // Dark Slate Blue
        Z: '#FF3333'  // Crimson
    };

    // Set the background color
    ctx.fillStyle = backgroundColors[upperCaseLetter];
    ctx.fillRect(0, 0, width, height);

    // Set up text properties for drawing the letter
    const fontSize = Math.floor(Math.min(width, height) / 2); // Adjust font size relative to canvas size
    ctx.font = `${fontSize}px Arial`; // Set font size and type
    ctx.fillStyle = 'white'; // Color of the letter
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate the position to draw the letter at the center of the canvas
    const x = width / 2;
    const y = height / 2;

    // Draw the letter in the center
    ctx.fillText(upperCaseLetter, x, y);

    // Return the avatar as a PNG buffer
    return myCanvas.toBuffer('image/png');
}

function getCurTime() {
// function via stack overflow user video-reviews.net
    let now     = new Date(); 
    let year    = now.getFullYear();
    let month   = now.getMonth()+1; 
    let day     = now.getDate();
    let hour    = now.getHours();
    let minute  = now.getMinutes();
    let second  = now.getSeconds(); 
    if (month.toString().length == 1) {
         month = '0'+month;
    }
    if (day.toString().length == 1) {
         day = '0'+day;
    }   
    if (hour.toString().length == 1) {
         hour = '0'+hour;
    }
    if (minute.toString().length == 1) {
         minute = '0'+minute;
    }
    if(second.toString().length == 1) {
        second = '0'+second;
    }   
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function statusCheck(res) {
    if (!res.ok) {
        throw new Error('Failed to fetch: ' + res.statusText);
    }
    return res.json();  // Assuming the response is in JSON format
}

async function initializeDB() {
    db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });
    console.log('Connected to the database.');
}

function hashCode(str) {
// hash function from stack overflow user Vitim.us
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}