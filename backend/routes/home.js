var request = require('request');

module.exports = function (app, nconf, serviceBusService) {

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


    app.post('/newimage/:city', function (req, res) {
        var data = req.body;
        data.forEach(function (img) {
            var url = "https://api.instagram.com/v1/media/" + img.object_id + "?client_id=" + nconf.get('instagramClientId');
            console.log(url);
            request(url, function (e, r, b) {
                var pic = {
                    city: req.params.city,
                    pic: b
                }
                console.log(pic);
                var message = { 
                    body: JSON.stringify(pic)                    
                };
                serviceBusService.sendTopicMessage('wazages', message, function (error) {
                    if (error) {
                        console.log('error sending message to topic - ' + error);
                    } else {
                        console.log('message sent!');
                    }
                })
            });
        })
        res.end();
    });
}
