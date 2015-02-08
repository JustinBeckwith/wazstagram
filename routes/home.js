var request = require('request');
var express = require('express');
var router = express.Router();

// render all messages from one city
router.get('/:city?', function (req, res) {
    res.render('index', { city: req.params.city || 'universe' });
}); 

// instagram get
router.get('/newimage/:city', function (req, res) {
    //   http://your-callback.com/url/?hub.mode=subscribe&hub.challenge=15f7d1a91c1f40f8a748fd134752feb3&hub.verify_token=myVerifyToken

    logger.info(req.params.city);
    logger.info(req.query['hub.challenge']);
    logger.info(req.query['hub.mode']);
    logger.info(req.query['hub.verify_token']);

    res.send(req.query['hub.challenge']);
});

var minIds = new Object();

// when a new city is posted from instagram
router.post('/newimage/:city', function (req, res) {
    console.log(req.body);
    var data = req.body;
    logger.info(data);
    data.forEach(function (img) {

        var lastId = minIds[req.params.city];

        var url = "https://api.instagram.com/v1/geographies/" + img.object_id + "/media/recent?client_id=" + nconf.get('instagramClientId');
        if (lastId) {
            url += "&min_id=" + lastId;
        }

        logger.info(url);
        request(url, function (e, r, b) {
            if (e && e != '') {
                logger.error("ERROR:getMedia::" + e);
                logger.error("ERROR:getMedia::" + JSON.stringify(e));
            } else {
                var data = null;
                try {
                    data = JSON.parse(b);
                } catch (e) {
                    // if the parse fails, let's find out why...
                    logger.error("ERROR:getMedia::\n" + b);
                }

                if (data.meta.code == 200) {

                    if (data.data && data.data.length > 0) {
                        var lastId = data.data[0].id;
                        logger.info('lastId for ' + req.params.city + ' is ' + lastId);
                        minIds[req.params.city] = lastId;

                        var pic = {
                            city: req.params.city,
                            pic: b
                        }                            
                        
                        publishFunc.call(this, pic);
                    }
                } else {
                    logger.error("ERROR::getMedia:: " + data.meta.error_message);
                }
            }
        });
    })
    res.end();
});

module.exports = router;


