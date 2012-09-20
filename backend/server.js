
/**
 * Module dependencies.
 */

var express = require('express')  
  , http = require('http')
  , path = require('path')
  , nconf = require('nconf')
  , azure = require('azure');

nconf.argv().env().file('keys.json');

var sbNamespace = nconf.get('AZURE_SERVICEBUS_NAMESPACE');
var sbKey = nconf.get('AZURE_SERVICEBUS_ACCESS_KEY');
var serviceBusService = azure.createServiceBusService(sbNamespace, sbKey);
serviceBusService.createTopicIfNotExists('wazages', function (error) {
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
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

require('./routes/home')(app, nconf, serviceBusService);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
