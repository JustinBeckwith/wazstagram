var request = require('request');

module.exports = function (app, nconf, serviceBusService, logger) {

    // home page
    app.get('/', function (req, res) {
        res.render('index.html');
    });

    // instagram get
    app.get('/:city', function (req, res) {
        logger.info(req.params.city);
        res.render('images.html');
    });

    // service calls to get media details
    app.get('/media/:id', function (req, res) {
        logger.info('request for media: ' + req.params.id);
        var url = "https://api.instagram.com/v1/media/" + req.params.id + "/?client_id=" + nconf.get('instagramClientId');
        logger.info(url);
        request(url, function (e, r, b) {
            res.end(req.query.callback + "(" + b + ");");  
        });
    });
}
