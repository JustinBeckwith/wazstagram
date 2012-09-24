
module.exports = function (app, nconf, serviceBusService) {

    // home page
    app.get('/', function (req, res) {
        res.render('index.html');
    });

    // instagram get
    app.get('/:city', function (req, res) {
        console.log(req.params.city);
        res.render('images.html');
    });
}
