
/**
 * Module dependencies.
 */

var express = require('express')  
  , http = require('http')
  , path = require('path')
  , nconf = require('nconf')
  , azure = require('azure')
  , winston = require('winston')
  , skywriter = require('winston-skywriter').Skywriter;


// read in keys and secrets
nconf.argv().env().file('keys.json');
var sbNamespace = nconf.get('AZURE_SERVICEBUS_NAMESPACE');
var sbKey = nconf.get('AZURE_SERVICEBUS_ACCESS_KEY');
var stName = nconf.get('AZURE_STORAGE_NAME');
var stKey = nconf.get('AZURE_STORAGE_KEY');

// set up a single instance of a winston logger, writing to azure table storage
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.Skywriter)({ 
            account: stName,
            key: stKey,
            partition: require('os').hostname() + ':' + process.pid
        })
    ]
});


logger.info('Started wazstagram backend');




var serviceBusService = azure.createServiceBusService(sbNamespace, sbKey);
var topicName = 'wazages';

serviceBusService.createTopicIfNotExists(topicName, function (error, topicCreated, response) {
    if (!error) {
        logger.info('topic ' + topicName + ' created or exists');
        cleanUpSubscriptions();
    } else {
        logger.error('error creating service topic ' + topicName, error);
    }
});


/** 
 * each time a new front end process is started, it creates a new subscription.  we try to clean
 * these up by checking for subscriptions which appear to have no listeners on the other end
 **/
function cleanUpSubscriptions() {
    logger.info('cleaning up subscriptions...');
    serviceBusService.listSubscriptions(topicName, function (error, subs, response) {
        if (!error) {
            logger.info('found ' + subs.length + ' subscriptions');
            for (var i = 0; i < subs.length; i++) {
                // if there are more than 100 messages on the subscription, assume the edge node is down 
                if (subs[i].MessageCount > 100) {
                    logger.info('deleting subscription ' + subs[i].SubscriptionName);
                    serviceBusService.deleteSubscription(topicName, subs[i].SubscriptionName, function (error, response) {
                        if (error) {
                            logger.error('error deleting subscription', error);
                        }
                    });
                }                
            }
        } else {
            logger.error('error getting topic subscriptions', error);
        }
        setTimeout(cleanUpSubscriptions, 60000);
    });
}

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

require('./routes/home')(app, nconf, serviceBusService, logger);

http.createServer(app).listen(app.get('port'), function(){
  logger.info("Express server listening on port " + app.get('port'));
});
