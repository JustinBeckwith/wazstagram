$(document)
    .ready(function () {
    	var socket = io.connect();
    	socket.on('connect', function () {
    		var city = '';
    		var urlParts = window.location.href.split("/");
    		for (var i = urlParts.length - 1; i >= 0; i--) {
    			if (urlParts[i]) {
    				city = urlParts[i];
    				break;
    			}
    		}
    		if (!city) {
    			alert('invalid url!  please give me a city.');
    		} else {
    			console.log('getting data for ' + city);
    			socket.emit('setCity', { city: city });
    		}
    	});

    	socket.on('newPic', function (pic) {
    		var p = JSON.parse(pic);
    		$.each(p.data, function (key, val) {
    			viewModel.addPicture(val.id, val.images, val.user, val.caption, val.location, val.comments, val.likes);
    		});
    	});
    	window.Radar = {
    		Browser: {
    			isMobileQuery: window.msMatchMedia ? window.msMatchMedia("screen and (max-width: 800px) and (max-height: 1280px)") : false
    		},
    		Components: {
    			ThumbnailViewer: {
    				pageSize: 15,
    			}
    		}
    	};
    	if (Radar.Browser.isMobileQuery.matches) {
    		Radar.Components.ThumbnailViewer.pageSize = 12;
    	}
    	Radar.Browser.isMobileQuery.addListener(mediaSizeChanged);


    	var User = function (username, profile_picture, id, full_name) {
    		this.username = username;
    		this.profile_picture = profile_picture;
    		this.id = id;
    		this.full_name = full_name;
    	};

    	var Comment = function (text, from) {
    		this.text = text;
    		this.from = new User(from.username, from.profile_picture, from.id, from.full_name);
    		this.fullHtml = this.text + " <img class='profile' src='" + this.from.profile_picture + "'/> " + this.from.full_name + " (" + this.from.username + ")"
    	};

    	var Location = function (latitude, longitude) {
    		this.latitude = latitude;
    		this.longitude = longitude;
    		this.fullText = "(" + this.latitude + ", " + this.longitude + ")";
    	};

    	var Picture = function (id, images, user, caption, location, comments, likes) {
    		var self = this;
    		this.id = id;
    		this.images = images;
    		this.user = new User(user.username, user.profile_picture, user.id, user.full_name);
    		if (caption == null) {
    			this.caption = null;
    		} else {
    			this.caption = new Comment(caption.text, caption.from);
    		}
    		this.captionWithFrom = ko.computed(function () {
    			if (this.caption == null) {
    				return null;
    			}
    			return (this.caption.fullHtml);
    		}, this);

    		if (location == null) {
    			this.location = null;
    		} else {
    			this.location = new Location(location.latitude, location.longitude);
    		}
    		this.fullLocation = ko.computed(function () {
    			if (this.location == null) {
    				return null;
    			}
    			return (this.location.fullText);
    		}, this);

    		if (comments == null) {
    			this.comments = null;
    		} else {
    			this.comments = ko.observableArray([]);
    			$.each(comments.data, function (key, val) {
    				self.comments.push(new Comment(this.text, this.from));
    			});
    		}

    		if (likes == null) {
    			this.likes = null;
    		} else {
    			this.likes = ko.observableArray([]);
    			$.each(likes.data, function (key, val) {
    				self.likes.push(new User(this.username, this.profile_picture, this.id, this.full_name));
    			});
    		};

    		this.pictureCaptionDisplay = ko.computed(function () {
    			if (self.caption != null && self.caption.text != null) {
    				return self.caption.text;
    			}
    			return "this picture";
    		});
    	};

    	var ViewModel = function () {
    		var self = this;
    		this.picturesWithBlanks = ko.observableArray([]);
    		this.backgroundPicture = ko.observable('linear-gradient(white, black);');
    		this.nextBackgroundPictureUrl = undefined;
    		this.detailPicture = ko.observable(null);
    		this.isDetailPicture = ko.observable(false);
    		this.isMapShown = ko.observable(false);
    		this.FindPicture = function(fnc) {
    			var a = this.picturesWithBlanks();
    			if (!fnc || typeof(fnc) != 'function') {
    				return null;
    			}
    			if (!a || !a.length || a.length < 1) return -1;
    			for (var i = 0; i < a.length; i++) {
    				if (fnc(a[i])) return a[i];
    			}
    			return null;
    		};
    		this.addPictureInternal = function(picture) {
    			self.picturesWithBlanks.unshift(picture);
    			viewModel.updateBlanks(Radar.Components.ThumbnailViewer.pageSize);
    			self.addPushPin(picture, false);
    		};
    		
    		this.routes = Sammy(function () {
    			this.get('#:picture', function () {
    				var sammy = this;

    				var picture = viewModel.FindPicture(function (pic) {
    					return pic.id == decodeURIComponent(sammy.params.picture);
    				});

    				if (picture == undefined || picture.id == null) return;
    				var onImgLoad = function (imgSrc) {
    					self.detailPicture(picture);
    					self.isDetailPicture(true);

    					// make async call to get updated comment and like data

    					var id = picture.id;
    					var url = "http://waztagram.cloudapp.net/media/" + id + "?callback=?";
    					$.ajax({
    						url: url,
    						dataType: 'JSONP',
    						type: 'GET',
    						timeout: 10000,
    						success: callback,
    						error: function (data, textStatus, jqXHR) {
    							console.log("ERROR: " + jqXHR);
    						}
    					});
    				};
    				fetchImage(picture.images.standard_resolution.url, onImgLoad);
    				if ($('#map').hasClass('mapShown')) {
    					$('#map')
							.addClass("mapHidden").removeClass("mapShown");
    					self.map.entities.remove(self.fullPushPin);
    					self.fullPushPin = null;
    					viewModel.isMapShown(false);
    					return;
    				}
    			});
    			this.get('#:picture/:map', function () {
    				var sammy = this;
    				var picture = viewModel.FindPicture(function (pic) {
    					return pic.id == decodeURIComponent(sammy.params.picture);
    				});
    				if (picture && sammy.params.map == "map") {
    					if ($('#map').hasClass('mapShown')) {
    						$('#map')
								.addClass("mapHidden").removeClass("mapShown");
    						self.map.entities.remove(self.fullPushPin);
    						self.fullPushPin = null;
    						viewModel.isMapShown(false);
    						return;
    					}

    					self.addPushPin(self.detailPicture(), true);
    					self.map.setView({ zoom: 14, center: new Microsoft.Maps.Location(self.detailPicture().location.latitude, self.detailPicture().location.longitude) });
    					$('#map')
							.removeClass("mapHidden").addClass("mapShown");
    					viewModel.isMapShown(true);
    				}

    			});
    			this.get('', function () {
    				if (self.isDetailPicture()) {
    					self.isDetailPicture(false);
    					self.detailPicture(null);
    				}
    				if ($('#map').hasClass('mapShown')) {
    					$('#map')
							.addClass("mapHidden").removeClass("mapShown");
    					self.map.entities.remove(self.fullPushPin);
    					self.fullPushPin = null;
    					viewModel.isMapShown(false);
    					return;
    				}
    			});
    		}).run();

    		this.addPicture = function (id, images, user, caption, location, comments, likes) {
    			var self = this;
    			var newPic = new Picture(id, images, user, caption, location, comments, likes);

    			$.each(this.picturesWithBlanks(), function (key, val) {
    				if (val.id == id) {
    					if (val != self.picturesWithBlanks()[key]) {
    						self.picturesWithBlanks()[key] = newPic;
    					}
    					return;
    				}
    			});

    			var firstTime = (viewModel.nextBackgroundPictureUrl == undefined);
    			self.nextBackgroundPictureUrl = images.standard_resolution.url;
    			if (firstTime == true) self.updateBackgroundPicture();

    			fetchImageFromPicture(newPic, this.addPictureInternal);
    		};

    		this.updateBackgroundPicture = function () {
    			var onImgLoad = function (imgSrc) {
    				$('#transitionImageDiv')
						.css('background-image', 'url(' + imgSrc + ')');
    				$('#transitionImageDiv')
						.toggleClass('hidden');

    				setTimeout(function () {
    					self.backgroundPicture('url(' + imgSrc + ')');
    					// hide the transition div
    					$('#transitionImageDiv')
							.toggleClass('hidden');
    				}, 500);
    			};
    			fetchImage(self.nextBackgroundPictureUrl, onImgLoad);
    		};

    		this.selectPicture = function (picture) {
    			location.hash = encodeURIComponent(picture.id);
    		};

    		function callback(data, textStatus, jqXHR) {
    			if (data) {
    				var newPic = new Picture(data.data.id, data.data.images, data.data.user, data.data.caption, data.data.location, data.data.comments, data.data.likes);
    				self.detailPicture(newPic);
    			}
    		}

    		this.unSelectPicture = function () {
    			location.hash = "";
    		};

    		this.updateBlanks = function (pageSize) {
    			var mod = self.picturesWithBlanks()
					.length % pageSize;
    			var blankCount = (pageSize - mod) % pageSize;

    			var blankPhoto = function () {
    				var blankImages = new Object();
    				var thumbnail = new Object();
    				thumbnail.url = null;
    				blankImages.thumbnail = thumbnail;
    				blankImages.standard_resolution = thumbnail;
    				return new Picture(null, blankImages, new User(null, null, null, null), null, null, null, null);
    			};

    			if (self.picturesWithBlanks()[pageSize] == null || self.picturesWithBlanks()[pageSize].id != null) {
    				for (var i = 0; i < pageSize - 1; i++) {
    					var blank = blankPhoto();
    					self.picturesWithBlanks.splice(1, 0, blank);
    				}
    				return;
    			}
    			while (self.picturesWithBlanks()[pageSize] != null && self.picturesWithBlanks()[pageSize].id == null) {
    				self.picturesWithBlanks.remove(self.picturesWithBlanks()[pageSize]);
    			}
    			if (self.picturesWithBlanks()[self.picturesWithBlanks()
					.length - 1].id != null) {
    				var blank = blankPhoto();
    				self.picturesWithBlanks.push(blank);
    			}
    		};

    		document.onreadystatechange = function() {
    			if (this.readyState == 'complete') {
    				var script = document.createElement('script');
    				script.type = 'text/javascript';
    				script.src = 'http://ecn.dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=7.0';
    				document.getElementsByTagName('head')[0].appendChild(script);
    				script.onreadystatechange = function() {
    					if (this.readyState == 'complete') {
    						self.map = new Microsoft.Maps.Map(document.getElementById('myMap'), { credentials: 'Arha1ch48UwizeokfrS6sqAhtuRIwwRZgtI5XHBlQf8gOETZ8G7JEgshVsS8HPJI' });
    					}
    				};
    			}

    		};

    		this.showMap = function () {
    			if (viewModel.isDetailPicture() && !viewModel.isMapShown()) {
    				location.hash = viewModel.detailPicture().id + "/map";
    				return;
    			}
    			else if (viewModel.isDetailPicture()) {
    				location.hash = viewModel.detailPicture().id;
    				return;
    			}
    			location.hash = "";
    		};

    		this.fullPushPin = null;

    		this.addPushPin = function (picture, showFull) {
    			var pushpinOptions;
    			if (showFull) {
    				pushpinOptions = {
    					width: null, height: null, htmlContent:
						"<div class='pushPinDiv'><svg class='pushPinSvg' xmlns='http://www.w3.org/2000/svg' version='1.1'>" +
						"<circle cx='8vw' cy='8.9vw' r='.7vw' stroke-width='0' fill='#7EECFB'/></svg></div>" +
						"<svg class='pushPinSvg pushPinSmallSvg' xmlns='http://www.w3.org/2000/svg' version='1.1'>" +
						"<circle cx='0' cy='0vw' r='.4vw' stroke-width='0' fill='#E34D4D'/></svg>" +
						"<div class='pushPinContainer'><img class='pushPinImage' src='" + picture.images.thumbnail.url + "'>" + picture.user.username + "</div>"
    				};
    			} else {
    				pushpinOptions = {
    					width: null, height: null, htmlContent:
						"<div class='hiddenPushPin' id='hidden" + picture.id + "' onmouseover='showFullPreview(\"" + picture.id + "\")' onmouseout='hideFullPreview(\"" + picture.id + "\")'><svg class='pushPinSvg pushPinSmallSvg' xmlns='http://www.w3.org/2000/svg' version='1.1'>" +
						"<circle cx='.375vw' cy='.375vw' r='.325vw' stroke-width='0' fill='#E34D4D'/></svg></div>" +
						"<div id='preview" + picture.id + "' class='mapHidden' style='z-index: 10'>" +
						"	<div class='pushPinDiv'><svg class='pushPinSvg' xmlns='http://www.w3.org/2000/svg' version='1.1'>" +
						"	<circle cx='8vw' cy='8.9vw' r='.7vw' stroke-width='0' fill='#7EECFB'/></svg></div>" +
						"	<svg class='pushPinSvg pushPinSmallSvg' xmlns='http://www.w3.org/2000/svg' version='1.1'>" +
						"	<circle cx='0' cy='0vw' r='.4vw' stroke-width='0' fill='#E34D4D'/></svg>" +
						"	<div class='pushPinContainer'><img class='pushPinImage' src='" + picture.images.thumbnail.url + "'>" + picture.user.username + "</div>" +
						"</div>"
    				};
    			}
    			if (self.map) {
    				var pushpinLocation = new Microsoft.Maps.Location(picture.location.latitude, picture.location.longitude);
    				var pushpin = new Microsoft.Maps.Pushpin(pushpinLocation, pushpinOptions);

    				if (showFull) {
    					self.fullPushPin = pushpin;
    				}

    				Microsoft.Maps.Events.addHandler(pushpin, 'click', function (e) {
    					self.map.entities.remove(self.fullPushPin);

    					self.selectPicture(picture);

    					self.addPushPin(picture, true);
    				});
    				self.map.entities.push(pushpin);
    			}
    		};
    	};

    	var viewModel = new ViewModel();
    	ko.applyBindings(viewModel);
    	setInterval(viewModel.updateBackgroundPicture, 10000);
    });

function fetchImage(src, onloadCallback) {
	var img = new Image();
	img.src = src;
	if (onloadCallback != null) {
		img.onload = function () {
			onloadCallback(this.src);
		};
	}
}

function fetchImageFromPicture(picture, onloadCallback) {
	var img = new Image();
	img.src = picture.images.thumbnail.url;
	if (onloadCallback != null) {
		img.onload = function () {
			onloadCallback(picture);
		};
	}
}

function toggleExpandDetails() {
	$('#detailSideBar')
		.toggleClass('expand');
}

function hideDetails() {
	$('#detailSideBar')
		.removeClass('expand');
}

function mediaSizeChanged() {
	if (Radar.Browser.isMobileQuery.matches) {
		Radar.Components.ThumbnailViewer.pageSize = 12;
	}
	else {
		Radar.Components.ThumbnailViewer.pageSize = 15;
	}
}

function showFullPreview(pictureId) {
	document.getElementById("preview" + pictureId).className = '';
}

function hideFullPreview(pictureId) {
	document.getElementById("preview" + pictureId).className = 'mapHidden';
}