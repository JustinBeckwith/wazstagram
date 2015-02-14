var express = require('express');
var http = require('http');
var favicon = require('serve-favicon');
var nconf = require('nconf');
var path = require('path');
var morgan = require('morgan');
var routes = require('./routes/home');
var winston = require('winston');
var bodyParser = require('body-parser');
var redis = require('redis');
var util = require('util');

// read in keys and secrets.  You can store these in a variety of ways.  I like to use a keys.json 
// file that is in the .gitignore file, but you can also store them in the env
nconf.argv().env().file('keys.json');

var universe = "universe";

// set up a single instance of a winston logger
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)()
    ]
});
logger.info('Started wazstagram frontend process');

function createRedisClient() {
    return redis.createClient(
        6379,
        nconf.get('redisHost'), 
        {
            auth_pass: nconf.get('redisKey'), 
            return_buffers: true
        }
    ).on("error", function (err) {
        logger.error("ERR:REDIS: " + err);
    });    
}

// create redis clients for the publisher and the subscriber
var redisSubClient = createRedisClient();
var redisPubClient = createRedisClient();

// configure the web server
var app = express();

// view engine setup
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(function(req, res, next) {
    res.locals.nconf = nconf;
    res.locals.logger = logger;
    res.locals.publishFunc = publishImage;
    next();
});
app.use('/', routes)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    logger.error(err.message);
    res.end();
});

// start socket.io server
var server = http.createServer(app);
var io = require('socket.io').listen(server);
server.listen(app.get('port'), function(){
  logger.info('Express server listening on port ' + app.get('port'));
});


io.sockets.on('connection', function (socket) {
    socket.on('setCity', function (data) {
        logger.info('new connection: ' + data.city);
        redisPubClient.lrange(data.city, 0, 100, function(err, picCache) {
            if (err) {
                logger.error(err);
                return;
            }
            logger.info("cache length: " + picCache.length);
            for (var i = 0; i < picCache.length; i++) {
                logger.info("PIC: " + JSON.parse(picCache[i].toString()).data[0].link);
                socket.emit('newPic', picCache[i].toString());
            }
            socket.join(data.city);
        });
    });
});

// listen to new images from redis pub/sub
redisSubClient.on('message', function(channel, message) {
    logger.verbose('channel: ' + channel + " ; message: " + message);
    var m = JSON.parse(message.toString());
    io.sockets.in (m.city).emit('newPic', m.pic);
    io.sockets.in (universe).emit('newPic', m.pic);
}).subscribe('pics');

// send an event to redis letting all clients know there
// is a new image available
function publishImage(message) {        
    logger.info('new pic published from: ' + message.city);
    logger.info(message.pic.data[0].link);
    redisPubClient.publish('pics', JSON.stringify(message));

    // cache results to ensure users get an initial blast of (n) images per city
    redisPubClient.lpush(message.city, message.pic);
    redisPubClient.ltrim(message.city, 0, 100);
    redisPubClient.lpush(universe, message.pic);
    redisPubClient.ltrim(universe, 0, 100);
}

module.exports = app;
