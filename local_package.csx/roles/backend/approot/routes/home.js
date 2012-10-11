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

    var minIds = new Object();

    app.post('/newimage/:city', function (req, res) {
        var data = req.body;
        console.log(data);
        data.forEach(function (img) {

            var lastId = minIds[req.params.city];

            var url = "https://api.instagram.com/v1/geographies/" + img.object_id + "/media/recent?client_id=" + nconf.get('instagramClientId');
            if (lastId) {
                url += "&min_id=" + lastId;
            }

            console.log(url);
            request(url, function (e, r, b) {
                var data = JSON.parse(b);
                if (data.meta.code == 200) {

                    if (data.data && data.data.length > 0) {                        
                        var lastId = data.data[0].id;
                        console.log('lastId for ' + req.params.city + ' is ' + lastId);
                        minIds[req.params.city] = lastId;

                        var pic = {
                            city: req.params.city,
                            pic: b
                        }
                        var message = {
                            body: JSON.stringify(pic)
                        };
                        serviceBusService.sendTopicMessage('wazages', message, function (error) {
                            if (error) {
                                console.log('error sending message to topic! \n' + JSON.stringify(error));
                            } else {
                                console.log('message sent!');
                            }
                        })
                    }
                } else {
                    console.log("ERROR::getMedia:: " + data.meta.error_message);
                }
            });
        })
        res.end();
    });
}
