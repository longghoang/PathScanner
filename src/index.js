const express = require('express');
const app = express();
const port = 4444;
const route = require('./routes');
const path = require('path');
const session = require('express-session');

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));




app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'resources', 'views'));


// Routes
route(app);

app.listen(port, () => console.log(`App listening at http://localhost:${port}/scan`));
