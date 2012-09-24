
/**
* Module dependencies.
*/

var express = require('express')
  , nconf = require('nconf')
  , azure = require('azure')
  , http = require('http')
  , path = require('path')
  , uuid = require('node-uuid');


nconf.argv().env().file('keys.json');

var sbNamespace = nconf.get('AZURE_SERVICEBUS_NAMESPACE');
var sbKey = nconf.get('AZURE_SERVICEBUS_ACCESS_KEY');
var serviceBusService = azure.createServiceBusService(sbNamespace, sbKey);
var subscriptionId = uuid.v4();
var topicName = "wazages";
var picCache = new Object();

serviceBusService.createTopicIfNotExists(topicName, function (error) {
    if (!error) {
        console.log('topic wazages created or exists');
    } else {
        console.log('error creating service topic wazages\n' + JSON.stringify(error));
    }
});

var app = express();

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.engine('html', require('ejs').renderFile);
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
    app.use(express.errorHandler());
});

require('./routes/home')(app, nconf, serviceBusService);

var server = http.createServer(app).listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});

var io = require('socket.io').listen(server);


//io.configure(function () {
//  io.set("transports", ["xhr-polling"]);
//});


io.sockets.on('connection', function (socket) {
    socket.on('setCity', function (data) {
        console.log('new connection: ' + data.city);
        if (picCache[data.city]) {
            for (var i = 0; i < picCache[data.city].length; i++) {
                socket.emit('newPic', picCache[data.city][i]);
            }
        }
        socket.join(data.city);
    });
});

/**
 * create the initial subscription to get events from service bus
 **/
serviceBusService.createSubscription(topicName, subscriptionId, function (error) {
    if (error) {
        console.log('ERROR::createSubscription:: ' + JSON.stringify(error));
        throw error;
    } else {
        getFromTheBus();
    }
});

/**
 * poll service bus for new pictures
 **/
function getFromTheBus() {
    serviceBusService.receiveSubscriptionMessage(topicName, subscriptionId, { timeoutIntervalInS: 5 }, function (error, message) {
        if (error) {
            if (error == "No messages to receive") {
                console.log('no messages...');
            } else {
                console.log('ERROR::receiveSubscriptionMessage\n ' + JSON.stringify(error))
                throw error;
            }
        } else {
            var body = JSON.parse(message.body);
            console.log('new pic published from: ' + body.city);
            cachePic(body.pic, body.city);
            io.sockets. in (body.city).emit('newPic', body.pic);
        }
        getFromTheBus();
    });
}

/**
 *  ensures users get an initial blast of 10 images per city
 **/
function cachePic(data, city) {
    // initialize the cache if it doesn't exist
    if (!picCache[city])
        picCache[city] = [];

    // add the picture to the end of the queue
    picCache[city].push(data);

    // only allow 10 items in the queue per city
    if (picCache[city].length > 10) 
        picCache[city].shift();
}
