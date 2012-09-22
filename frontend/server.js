
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

serviceBusService.createTopicIfNotExists(topicName, function (error) {
    if (!error) {
        console.log('topic wazages created or exists');
    } else {
        console.log('error creating service topic wazages');
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
        socket.join(data.city);
    });    
});

serviceBusService.createSubscription(topicName, subscriptionId, function (error) {
    if (error) {
        console.log('ERROR::createSubscription:: ' + error);
        throw error;
    } else {
        getFromTheBus();
    }
});

function getFromTheBus() {
    serviceBusService.receiveSubscriptionMessage(topicName, subscriptionId, { timeoutIntervalInS: 5 }, function (error, message) {
        if (error) {
            if (error == "No messages to receive") {
                console.log('no messages...');
            } else {
                console.log('ERROR::receiveSubscriptionMessage:: ' + error)
                throw error;
            }
        } else {            
            var body = JSON.parse(message.body);
            console.log('new pic published from: ' + body.city);                        
            io.sockets.in(body.city).emit('newPic', body.pic);
        }
        getFromTheBus();
    });
}
