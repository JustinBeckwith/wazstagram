module.exports = function (app) {

    // home page
    app.get('/', function (req, res) {
        res.render('index', { title: 'Home Page.  ' })
    });

    // instagram get
    app.get('/newimage/:city', function (req, res) {
        //   http://your-callback.com/url/?hub.mode=subscribe&hub.challenge=15f7d1a91c1f40f8a748fd134752feb3&hub.verify_token=myVerifyToken
        
        console.log(req.params.city);
        console.log(req.query['hub.challenge']);
        console.log(req.query['hub.mode']);
        console.log(req.query['hub.verify_token']);

        res.send(req.query['hub.challenge']);
    });   
}
