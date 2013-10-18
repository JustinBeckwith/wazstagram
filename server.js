
/**
* Module dependencies.
*/

var express = require('express')
  , nconf = require('nconf')
  , azure = require('azure')
  , http = require('http')
  , path = require('path')
  , uuid = require('node-uuid')
  , winston = require('winston')
  , skywriter = require('winston-skywriter').Skywriter
  , redis = require('redis');


// read in keys and secrets.  You can store these in a variety of ways.  I like to use a keys.json 
// file that is in the .gitignore file, but you can also store them in the env
nconf.argv().env().file('keys.json');
var stName = nconf.get('AZURE_STORAGE_NAME');
var stKey = nconf.get('AZURE_STORAGE_KEY');

var redisUrl = "hashtagredis.cloudapp.net";
var redisPassword = "redpolo";
var redisPort = 10001;


var redisClient = redis.createClient(redisPort, redisUrl); 
redisClient.auth(redisPassword, function() 
    {
        console.log("Connected!");
    });

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
logger.info('Started wazstagram frontend process');;


// configure service bus
var picCache = new Object();
var universe = "universe";
picCache[universe] = [];

// configure the web server
var app = express();

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
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

require('./routes/home')(app, nconf, logger, publishImage);

var server = http.createServer(app).listen(app.get('port'), function () {
    logger.info("Express server listening on port " + app.get('port'));
});

// set up socket.io to establish a new connection with each client
var io = require('socket.io').listen(server);

io.configure(function () {
    io.set("transports", ["xhr-polling"]);
});

io.sockets.on('connection', function (socket) {
    socket.on('setCity', function (data) {
        logger.info('new connection: ' + data.city);
        console.log("GETTTING CACHED DATA!");
        redisClient.lrange("pics", 0, 99, function(err, pics) {
            console.log("LENGTH OF AWESOME ARRAY: " + pics.length);
            if (pics) {
                for (var i = 0; i < pics.length; i++) {
                    socket.emit('newPic', pics[i]);
                }
            }
            socket.join(data.city);
        });
        socket.join(data.city);
    });
});

// poll service bus for new pictures
function publishImage(message) {        
    logger.info('new pic published from: ' + message.city);
    cachePic(message.pic, message.city);    
    io.sockets.in (message.city).emit('newPic', message.pic);
    io.sockets.in (universe).emit('newPic', message.pic);
}

// ensures users get an initial blast of 10 images per city
function cachePic(data, city) {
    console.log("CACHING DATA!!!!")
    redisClient.lpush("pics", data);
    redisClient.ltrim("pics", 0, 15);
}