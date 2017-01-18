window.onload = function() {
	var smoother = new Smoother([0.999, 0.999, 0.999, 0.999], [0, 0, 0, 0]),
		video = document.getElementById('video'),
		// glasses = document.getElementById('glasses'),
		dealEffect = document.getElementById("deal-effect"),
		btnDesert = document.getElementById("chroma-effect"),
		detector,
		canvas = document.getElementById('canvas'),
		context = canvas.getContext('2d'),
		watchDeal,
		canvasBuf,
		encoder,
		seriously,
		isChromaEffect = false,
		isDealEffect = false,
		isGifRecording = false,
		isFaceFound = false;
		gifFrameRate = 2,
		gifCurrentFrame = 0,
		dealSongEffectTime = 10000;

	canvas.width = 0;
	var glasses = new Image();
	glasses.src = 'img/dealglasses.png';

	var gifCanvas = $('<canvas id="gif-canvas">')[0];
	var bufCanvas = $('<canvas>');
	var $glassIndicator = $('.glass-indicator');
	var $indicatorDescription = $('.indicator-desc');
	var gifContext = gifCanvas.getContext('2d');
	var gifRatio = 2;

	$glassIndicator.hide();
	$indicatorDescription.hide();

	createjs.Sound.registerSound("assets/dealwitsong.ogg", "dealwitsong");

	dealEffect.addEventListener('click', function() {
		// if (isDealEffect) {
		// 	// video.paused
		// 	video.play();
		// 	compatibility.requestAnimationFrame(play);
		// } else {
			setDealEffect(true);
			createjs.Sound.stop();
			var sound = createjs.Sound.play("dealwitsong", {offset: 0, volume: 0.5});
			$indicatorDescription.show();
			encoder = initGifEncoder();
			setTimeout(function() {
				video.pause();
				compatibility.requestAnimationFrame(applyDealWithItEffect);
			}, dealSongEffectTime);
		// }
	}, false);

	// Getting video
	try {
		compatibility.getUserMedia({video: true}, function(stream) {
			try {
				video.src = compatibility.URL.createObjectURL(stream);
				video.play();
			} catch (error) {
				video.src = stream;
			}
			compatibility.requestAnimationFrame(play);
		}, function (error) {
			alert('WebRTC not available');
		});
	} catch (error) {
		alert(error);
	}

	var play = function() {
		if (video.paused || isChromaEffect) return;//video.play();
		compatibility.requestAnimationFrame(play);
		if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0) {
			return;
		}

		// if (btnDesert.disabled) btnDesert.disabled = false;

		if (!canvas.width) {
			initCanvas();
		}
		var coords = {};

		if (isGifRecording) {
			coords = getFaceCoords();
			if (coords) {
				coords = getGlassesCoords(coords);
				if (!isFaceFound) {
					isFaceFound = true;
					$glassIndicator.show();
				}
			} else {
				// draw same place
				if (isFaceFound) {
					isFaceFound = false;
					$glassIndicator.hide();
				}
			}
		}
		drawFrame(coords);

		if (isGifRecording) {
			gifCurrentFrame ++;
			if (gifCurrentFrame === gifFrameRate) {
				gifCurrentFrame = 0;
				drawGifCanvas();
				encoder.addFrame(gifContext, {delay: 100, copy: true});
			}
		}
	};

	var getFaceCoords = function() {
		// Prepare the detector once the video dimensions are known:
		if (!detector) {
			var width = ~~(60 * video.videoWidth / video.videoHeight);
			var height = 60;
			detector = new objectdetect.detector(width, height, 1.1, objectdetect.frontalface);
		}

		// Perform the actual detection:
		var coords = detector.detect(video, 1);
		if (!coords[0]) {
			return false;
		}
		var coord = coords[0];
		coord = smoother.smooth(coord);
		// debugData.coords = coord;

		// Rescale coordinates from detector to video coordinate space:
		coord[0] *= video.videoWidth / detector.canvas.width;
		coord[1] *= video.videoHeight / detector.canvas.height;
		coord[2] *= video.videoWidth / detector.canvas.width;
		coord[3] *= video.videoHeight / detector.canvas.height;

		return coord;
	};

	var getGlassesCoords = function(coord) {
		var c = {};
		// c.x = ~~(coord[0] + coord[2] * 1.0/8);
		c.x = ~~(coord[0] - coord[2]/6);
		c.y = ~~(coord[1] + coord[3] * 0.8/8);
		c.w = ~~(coord[2]);
		c.h = ~~(coord[3]);

		return c;
	};

	var drawFrame = function() {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(video, 0, 0);
		// context.drawImage(glasses, c.x, c.y, c.w, c.h);
	};

	var drawGlasses = function(faceCoords) {
		var glassesCoords = getGlassesCoords(faceCoords),
			params = {
				x: -100,
				y: -100
			};

		createjs.Tween.get(params, {
			onChange: function() {
				context.putImageData(canvasBuf, 0, 0);
				context.drawImage(glasses, params.x, params.y, faceCoords[2], faceCoords[3]);
				drawGifCanvas();

				encoder.addFrame(gifContext, {delay: 50, copy: true});
				// console.log(params);
			}
		}).
		to({
			x: glassesCoords.x,
			y: glassesCoords.y
		}, 1500)
		.call(function() {
			setTimeout(function() {
				console.log('finish');
				$glassIndicator.hide();
				$indicatorDescription.hide();

				encoder.addFrame(gifContext, {delay: 1200, copy: true});
				encoder.render();
				encoder.on('finished', function(blob, data) {
					var src = window.URL.createObjectURL(blob);
					createjs.Sound.stop();
					//$('<img/>').attr('src', src).appendTo('body');
					showDealIt(src);
					setDealEffect(false);
					video.play();
					compatibility.requestAnimationFrame(play);
				});

			}, 1000);
		});
	};

	var initCanvas = function() {
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		bufCanvas
			.attr('width', canvas.width)
			.attr('height', canvas.height);

		gifCanvas.width = canvas.width / gifRatio;
		gifCanvas.height = canvas.height / gifRatio;
		gifContext.scale(1 / gifRatio, 1 / gifRatio);
	};

	var toGrayscale = function() {
		var c = canvas,
			ctx = context,
			idataSrc = ctx.getImageData(0, 0, c.width, c.height), // original
			idataTrg = ctx.createImageData(c.width, c.height),    // empty data
			dataSrc = idataSrc.data,                              // reference the data itself
			dataTrg = idataTrg.data,
			len = dataSrc.length, i = 0, luma;

		// convert by iterating over each pixel each representing RGBA
		for(; i < len; i += 4) {
			// calculate luma, here using rec601
			luma = dataSrc[i] * 0.299 + dataSrc[i+1] * 0.587 + dataSrc[i+2] * 0.114;

			// update target's RGB using the same luma value for all channels
			dataTrg[i] = dataTrg[i+1] = dataTrg[i+2] = luma;
			dataTrg[i+3] = dataSrc[i+3];                            // copy alpha
		}

		return idataTrg;
	};

	var applyDealWithItEffect = function() {
		var grayscale = toGrayscale();
		canvasBuf = grayscale;
		context.putImageData(grayscale, 0, 0);
		var coords = getFaceCoords();
		drawGlasses(coords);
	};

	var $modal = $('#deal-it-modal'),
		$frame = $modal.find('.img-frame'),
		$save = $modal.find('.save-gif');

	$save.on('click', function() {
		var $img = $frame.find('img');
		var time = new Date().getTime();
		var link = document.createElement('a');
		link.target = "_blank";
		link.download = "deal-it-" + time + ".gif";
		link.href = $img[0].src;
		link.click();

		$(['href="' + $img[0].src + '"']).remove();
		$modal.modal('hide');
	});

	var showDealIt = function(src) {
		var $modal = $('#deal-it-modal'),
			$frame = $modal.find('.img-frame'),
			$save = $modal.find('.save-gif');

		$modal.modal('show');

		var $img = $frame.find('img');
		if ($img.length) $img.remove();

		$('<img/>').attr('src', src).appendTo($frame);
	};

	var setDealEffect = function(status) {
		dealEffect.disabled = status;
		isDealEffect = status;
		isGifRecording = status;
	};

	var initGifEncoder = function() {
		var gif = new GIF({
			workers: 2,
			workerScript: 'vendor/js/gif.worker.js',
			quality: 10,
			width: gifCanvas.width,
			height: gifCanvas.height,
		});
		return gif;
	};

	var drawGifCanvas = function() {
		var data = context.getImageData(0, 0, canvas.width, canvas.height);
		bufCanvas[0].getContext('2d').putImageData(data, 0, 0);

		gifContext.drawImage(bufCanvas[0], 0, 0);
		data = null;
	};
}