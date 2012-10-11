var request = require('request');

var testData = [
    {
        "subscription_id": "1",
        "object": "user",
        "object_id": "1234",
        "changed_aspect": "media",
        "time": 1297286541
    },
    {
        "subscription_id": "2",
        "object": "tag",
        "object_id": "nofilter",
        "changed_aspect": "media",
        "time": 1297286541
    }];

    console.log(JSON.stringify(testData));

request('http://localhost:59837/newimage/seattle', 
    { 
        "json": testData, 
        "method": "post" 
    }, function (err, response, body) {
            
        if (err) {
            console.log('ERROR! ' + err);
        }
        console.log(body);            
});


