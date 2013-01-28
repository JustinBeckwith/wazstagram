module.exports = function (app, nconf, serviceBusService, logger) {

    app.get('/:city?', function (req, res) {
        res.render('index', { city: req.params.city || 'universe' });
    });
}
