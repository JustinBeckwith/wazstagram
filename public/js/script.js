var picBuffer = [];
var picCount = 0;

var appInsights=window.appInsights||function(config){
        function s(config){t[config]=function(){var i=arguments;t.queue.push(function(){t[config].apply(t,i)})}}var t={config:config},r=document,f=window,e="script",o=r.createElement(e),i,u;for(o.src=config.url||"//az416426.vo.msecnd.net/scripts/a/ai.0.js",r.getElementsByTagName(e)[0].parentNode.appendChild(o),t.cookie=r.cookie,t.queue=[],i=["Event","Exception","Metric","PageView","Trace"];i.length;)s("track"+i.pop());return config.disableExceptionTracking||(i="onerror",s("_"+i),u=f[i],f[i]=function(config,r,f,e,o){var s=u&&u(config,r,f,e,o);return s!==!0&&t["_"+i](config,r,f,e,o),s}),t
    }({
        instrumentationKey:"6468c111-7bbe-4205-93c9-61f2bc79875b"
    });
    
    window.appInsights=appInsights;
    appInsights.trackPageView();

$(function () {

    var socket = io.connect();

    socket.on('connect', function () {
        console.log('getting data for ' + city);
        socket.emit('setCity', { city: city });
    });

    socket.on('newPic', function (pic) {
        var p = JSON.parse(pic);
        picBuffer = picBuffer.concat(p.data);
    });

    $("#pics").on("click", "img", function () {
        var id = $(this).data("id");
        console.log(id);
    });

    readPic();
});

function readPic() {
    try {
        if (picBuffer.length > 0) {
            var pic = picBuffer.shift();
            var $img = $("<img data-id=\"" + pic.id + "\" src=\"" + pic.images.low_resolution.url + "\">");
            picCount++;
            $img.on('load', function () {
                $(this).fadeIn();
            }).each(function () {
                if (this.complete) $(this).load();
            });
            $("#pics").prepend($img);
        }
    } catch (e) {
        console.log(e);
    }
    setTimeout(readPic, picCount < 15 ? 100 : 1500);
}