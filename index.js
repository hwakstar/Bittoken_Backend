const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'your_secret_key'; // Change this to a secure key

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const staticPath = path.join(__dirname, 'build'); // Adjust 'build' to your actual build directory
app.use(express.static(staticPath));
app.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html')); // Serve your main HTML file
});
// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'laravel'
});

// Connect to the database
db.connect(err => {
    if (err) {
        throw err;
    }
    console.log('MySQL connected...');
});
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like 'Yahoo', 'Outlook', etc.
    auth: {
        user: 'hwakstar79@gmail.com', // Your email address
        pass: 'djrhdejrhd' // Your email password or app-specific password
    }
});
// Function to send verification email
const sendVerificationEmail = (recipientEmail, verificationCode) => {
    const mailOptions = {
        from: 'hwakstar79@gmail.com', // Sender address
        to: recipientEmail, // List of recipients
        subject: 'Verification Code', // Subject line
        text: `Your verification code is: ${verificationCode}`, // Plain text body
        // html: '<p>Your verification code is: <strong>${verificationCode}</strong></p>' // HTML body (optional)
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log('Error sending email:', error);
        }
        console.log('Email sent:', info.response);
    });
};
const getCurrentTime = () => {
    const now = new Date();
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(now.getDate()).padStart(2, '0');
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

console.log(getCurrentTime());
// Register endpoint
app.post('/register', (req, res) => {
    console.log(req.body);
    const { username, email, password } = req.body;
    
    // Check if the user already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).send({ message: 'Error checking user existence' });
        }
        
        // If a user with that email exists, send a conflict response
        if (results.length > 0) {
            return res.status(409).send({ message: 'User already exists' });
        }
        
        // Proceed with registration if the user does not exist
        const hashedPassword = bcrypt.hashSync(password, 8);
        db.query('INSERT INTO users (name, email, password, remember_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', 
            [username, email, hashedPassword, '', getCurrentTime(), getCurrentTime()], 
            (err, result) => {
                if (err) {
                    return res.status(500).send({ message: 'Error registering user' });
                }
                res.status(201).send({ message: 'User registered successfully!' });
            }
        );
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { name, password } = req.body;
        console.log(name);
        
    db.query('SELECT * FROM users WHERE name = ?', [name], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send({ message: 'User not found' });
        }

        const user = results[0];
        const passwordIsValid = bcrypt.compareSync(password, user.password);

        if (!passwordIsValid) {
            return res.status(401).send({ accessToken: null, message: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: 86400 }); // 24 hours
        res.status(200).send({ id: user.id, username: user.username, accessToken: token });
    });
});

// Forget Password endpoint

app.post('/forgetpassword',(req,res)=>{
    const gmail = req.body.gmail; // Get the Gmail from the request body
    console.log(gmail);

    // Query the database to check if the email exists
    db.query('SELECT * FROM users WHERE email = ?', [gmail], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send({ message: 'Internal server error' });
        }

        // Check if any results were returned
        if (results.length === 0) {
            return res.status(404).send({ message: 'User not found' });
        }
        const verificationCode = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit verification code
        console.log(verificationCode);
        sendVerificationEmail(gmail, verificationCode);
        
        // If the user exists, you can proceed with your logic (e.g., sending a reset link)
        res.status(200).send({ message: 'Password reset link sent to your email' });
    });
})


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});