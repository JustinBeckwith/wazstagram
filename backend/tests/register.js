var cities = require("../cities").cities,
    http = require("http"),
    request = require('request'),
    nconf = require('nconf'),
    util = require('util');

nconf.argv().env().file('../keys.json');

cities.forEach(function (city) {
    
    var options = {
        "client_id": nconf.get("instagramClientId"),
        "client_secret": nconf.get("instagramClientSecret"),
        "object": "geography",
        "aspect": "media",
        "lat": city.lat,
        "lng": city.long,
        "radius": 5000,
        "callback_url": util.format(nconf.get("subscriptionCallbackUrl"), city.name)
    }    

    request('https://api.instagram.com/v1/subscriptions/', 
        { 
            "form": options, 
            "method": "post" 
        }, function (err, response, body) {
            
            if (err) {
                console.log('ERROR! ' + err);
            }
            console.log(body);            
        });

});


