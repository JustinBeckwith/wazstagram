var express = require('express');
var http = require('http');
var favicon = require('serve-favicon');
var nconf = require('nconf');
var path = require('path');
var morgan = require('morgan');
var routes = require('./routes/home');
var winston = require('winston');
var bodyParser = require('body-parser');
//var skywriter = require('winston-skywriter').Skywriter;

// read in keys and secrets.  You can store these in a variety of ways.  I like to use a keys.json 
// file that is in the .gitignore file, but you can also store them in the env
nconf.argv().env().file('keys.json');
var stName = nconf.get('AZURE_STORAGE_NAME');
var stKey = nconf.get('AZURE_STORAGE_KEY');

// set up a single instance of a winston logger, writing to azure table storage
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)()
        // new (winston.transports.Skywriter)({ 
        //     account: stName, 
        //     key: stKey,
        //     partition: require('os').hostname() + ':' + process.pid
        // })
    ]
});
logger.info('Started wazstagram frontend process');

// configure service bus
var picCache = new Object();
var universe = "universe";
picCache[universe] = [];

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


var server = http.createServer(app);
var io = require('socket.io').listen(server);
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


io.sockets.on('connection', function (socket) {
    socket.on('setCity', function (data) {
        logger.info('new connection: ' + data.city);
        if (picCache[data.city]) {
            for (var i = 0; i < picCache[data.city].length; i++) {
                socket.emit('newPic', picCache[data.city][i]);
            }
        }
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

module.exports = app;
