const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const port = 4444;
const route = require('./routes');
const path = require('path');



app.use(
  express.urlencoded({
    extended: true,
  }),
);



app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'resources', 'views'));



// Routes
route(app);

app.listen(port, () => console.log(`App listening at http://localhost:${port}`));
