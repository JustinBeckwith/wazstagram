
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
  , skywriter = require('winston-skywriter').Skywriter;


// read in keys and secrets.  You can store these in a variety of ways.  I like to use a keys.json 
// file that is in the .gitignore file, but you can also store them in the env
nconf.argv().env().file('keys.json');
var stName = nconf.get('AZURE_STORAGE_NAME');
var stKey = nconf.get('AZURE_STORAGE_KEY');
var redisUrl = "redis://redistogo-appharbor:553eee0ecf0a87501f5c67cb4302fc55@angler.redistogo.com:9313/";

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
        // if (picCache[data.city]) {
        //     for (var i = 0; i < picCache[data.city].length; i++) {
        //         socket.emit('newPic', picCache[data.city][i]);
        //     }
        // }
        socket.join(data.city);
    });
});

// poll service bus for new pictures
function publishImage(message) {        
    logger.info('new pic published from: ' + message.city);
    //cachePic(message.pic, message.city);    
    io.sockets.in (message.city).emit('newPic', message.pic);
    io.sockets.in (universe).emit('newPic', message.pic);
}

// ensures users get an initial blast of 10 images per city
function cachePic(data, city) {
    // initialize the cache if it doesn't exist
    if (!picCache[city])
        picCache[city] = [];

    // add the picture to the end of the queue for the city and universe
    picCache[city].push(data);
    picCache[universe].push(data);

    // only allow 10 items in the queue per city
    if (picCache[city].length > 150)
        picCache[city].shift();

    // keep the universe queue down to 10 as well
    if (picCache[universe].length > 150)
        picCache[universe].shift();
}
