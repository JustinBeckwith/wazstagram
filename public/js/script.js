var picBuffer = [];
var picCount = 0;

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