var picBuffer = [];
var picCount = 0;

window.appInsights={queue:[],applicationInsightsId:null,accountId:null,appUserId:null,configUrl:null,start:function(n){function u(n,t){n[t]=function(){var i=arguments;n.queue.push(function(){n[t].apply(n,i)})}}function f(n){var t=document.createElement("script");return t.type="text/javascript",t.src=n,t.async=!0,t}function r(){i.appendChild(f("//az416426.vo.msecnd.net/scripts/ai.0.js"))}var i,t;this.applicationInsightsId=n;u(this,"logEvent");u(this,"logPageView");i=document.getElementsByTagName("script")[0].parentNode;this.configUrl===null?r():(t=f(this.configUrl),t.onload=r,t.onerror=r,i.appendChild(t));this.start=function(){}}};
appInsights.start("2528f039-82a4-414a-8644-2931b2ea8682");
appInsights.logPageView();

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