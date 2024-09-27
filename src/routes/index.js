const siteRouter = require('./scan');


function route(app) {
    app.use('/', siteRouter);
}

module.exports = route;