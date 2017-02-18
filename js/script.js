var gifBlob;
var dealWithGif;
$(function() {
    dealWithGif = new DealWithGif();
    dealWithGif.init();
});

var DealWithGif = function() {
    var _DealWithGif = this,
        smoother = new Smoother([0.999, 0.999, 0.999, 0.999], [0, 0, 0, 0]),
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
        lastFoundCoords,
        isChromaEffect = false,
        isDealEffect = false,
        isGifRecording = false,
        isFaceFound = false;
        gifFrameRate = 2,
        gifCurrentFrame = 0,
        gifPrevFrameTime = 0,
        gifDelay = 50,
        dealSongEffectInitTime = 10000,
        dealSongEffectTime = 1000,
        // dealSongEffectTime = 2000,
        $glassIndicator = $('.glass-indicator'),
        $indicatorDescription = $('.indicator-desc'),
        $recBlock = $('.rec-block-content'),
        gifCanvas = $('<canvas id="gif-canvas">')[0],
        bufCanvas = $('<canvas>'),
        gifContext = gifCanvas.getContext('2d'),
        gifQuality = 20,
        gifRatio = 2,
        glasses = new Image();

    canvas.width = 0;
    glasses.src = 'img/dealglasses.png';

    // $glassIndicator.hide();
    // $indicatorDescription.hide();
    // $recBlock.hide();

    this.init = function() {
        createjs.Sound.registerSound("assets/dealwitsong.ogg", "dealwitsong");
        startVideo();
        dealEffect.addEventListener('click', handleDeal, false);
    };

    this.setDealTime = function(seconds) {
        dealSongEffectTime = seconds * 1000;
        D.log(dealSongEffectTime);
    };

    this.setEncoderQulaity = function(quality) {
        D.log(quality);
        gifQuality = 30 - quality;
    };

    var initRangeSlider = function() {
        encoder = initGifEncoder();
        $('#dealtime').rangeslider({
            polyfill: false,
            onSlide: function (position, value) {
                _DealWithGif.setDealTime(value);
                localStorage.setItem('dealtime', value);
                $('.dealtime .range-current').html(value);
            }
        });

        var value = localStorage.getItem('dealtime');
        D.log(value);
        if (value) {
            $('#dealtime').val(value).change();
            $('.dealtime range-current').val(value);
        }

        $('#gif-quality').rangeslider({
            polyfill: false,
            onSlide: function (position, value) {
                _DealWithGif.setEncoderQulaity(value);
                localStorage.setItem('gif-quality', value);
                $('.gif-quality .range-current').html(value);
            }
        });
        var value = localStorage.getItem('gif-quality');
        D.log(value);
        if (value) {
            $('#gif-quality').val(value).change();
            $('.gif-quality range-current').val(value);
        }
    };

    var handleDeal = function() {
        // if (isDealEffect) {
        //  // video.paused
        //  video.play();
        //  compatibility.requestAnimationFrame(play);
        // } else {
            encoder.abort();
            setDealEffect(true);
            createjs.Sound.stop();
            isFaceFound = false;
            var offset = dealSongEffectInitTime - dealSongEffectTime;
            var sound = createjs.Sound.play("dealwitsong", {offset: offset, volume: 0.5}); // 0.5
            $recBlock.show();
            $indicatorDescription.show();
            setTimeout(function() {
                video.pause();
                compatibility.requestAnimationFrame(applyDealWithItEffect);
            }, dealSongEffectTime);
        // }
    };

    var startVideo = function() {
        // Getting video
        try {
            compatibility.getUserMedia({audio: false, video: {
                width: 640,
                height: 480,
                require: ["width", "height"]
            }}, function(stream) {
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
    };

    var play = function() {
        if (video.paused || isChromaEffect) return;//video.play();
        compatibility.requestAnimationFrame(play);
        if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0) {
            return;
        }

        // if (btnDesert.disabled) btnDesert.disabled = false;

        if (!canvas.width) {
            initCanvas();
            initRangeSlider();
        }
        var coords = {};

        if (isGifRecording) {
            coords = getFaceCoords();
            if (coords) {
                lastFoundCoords = coords;
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
                var currentTime = new Date().getTime();
                if (gifPrevFrameTime) {
                    gifDelay = currentTime - gifPrevFrameTime;
                }
                D.log(gifDelay);
                gifPrevFrameTime = currentTime;
                drawGifCanvas();
                encoder.addFrame(gifContext, {delay: gifDelay, copy: true});
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
        $recBlock.hide();

        createjs.Tween.get(params, {
            onChange: function() {
                context.putImageData(canvasBuf, 0, 0);
                context.drawImage(glasses, params.x, params.y, faceCoords[2], faceCoords[3]);
                drawGifCanvas();

                encoder.addFrame(gifContext, {delay: 50, copy: true});
                // D.log(params);
            }
        }).
        to({
            x: glassesCoords.x,
            y: glassesCoords.y
        }, 1500)
        .call(function() {
            setTimeout(function() {
                D.log('finish');
                $glassIndicator.hide();
                $indicatorDescription.hide();

                encoder.addFrame(gifContext, {delay: 1200, copy: true});
                encoder.setOption('quality', gifQuality);
                encoder.render();
                encoder.on('finished', function(blob, data) {
                    gifBlob = blob;
                    var src = window.URL.createObjectURL(blob);
                    // createjs.Sound.stop();
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
        if (!coords) {
            coords = lastFoundCoords;
        }
        drawGlasses(coords);
    };

    var $modal = $('#deal-it-modal'),
        $frame = $modal.find('.img-frame'),
        $save = $modal.find('.save-gif');
        $share = $modal.find('.send-gif');

    $share.on('click', function() {
        vkPoster.post();
    });

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
        if ($img.length) {
            window.URL.revokeObjectURL($img.get(0).src);
            $img.remove();
        }

        $('<img/>').attr('src', src).appendTo($frame);
    };

    var setDealEffect = function(status) {
        dealEffect.disabled = status;
        isDealEffect = status;
        isGifRecording = status;
        gifPrevFrameTime = false;
    };

    var initGifEncoder = function() {
        var gif = new GIF({
            workers: 3,
            workerScript: 'vendor/js/gif.worker.js',
            quality: 30,
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
};

var vkPoster = {
    userId: null,
    filename: null,
    post: function() {
        VK.init({
            apiId: 5834212
        });
        VK.Auth.login(this.stepOneGetUploadServer.bind(this), 131072+8192); //'docs,wall'
    },
    stepOneGetUploadServer: function(r) {
        D.log(r);
        if (!r.session) {
            return;
        }
        this.userId = r.session.mid;
        VK.Api.call(
            'docs.getUploadServer',
            {},
            this.stepTwoUploadImageToLocalServer.bind(this)
        );
    },
    stepTwoUploadImageToLocalServer: function(response) {
        D.log(response);
        if (!response.response) {
            return;
        }
        var vkThis = this;
        var r = response.response;
        var data = new FormData();
        var time = new Date().getTime();
        var filename = 'deal-with-' + new Date().getTime() + '.gif';
        this.filename = filename;
        data.append('photo', gifBlob, filename);
        data.append('url', r.upload_url);
        $.ajax({
            xhr: this.XHRProgressbar,
            url: 'upload.php',
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            type: 'POST',
            success: function(data) {
                vkThis.stepThreeUploadImageToVkServer(data);
            }
        });
    },
    stepThreeUploadImageToVkServer: function(data) {
        var file = JSON.parse(data);
        VK.Api.call('docs.save', {
            user_id: this.userId,
            group_id: this.userId,
            file: file.file,
        }, this.stepFourPostToWall.bind(this));
    },
    stepFourPostToWall: function (s) {
        D.log(s);
        VK.Api.call('wall.post', {message: '', attachments: 'doc' + this.userId + '_' + s.response[0].did}, this.stepFiveAfterPost.bind(this));
    },
    stepFiveAfterPost: function(r) {
        // $.ajax({ url: 'delete.php?filename=' + this.filename });
    },
    XHRProgressbar: function () {
        var xhr = new window.XMLHttpRequest();
        var $progress = $('.custom-progress-bar .bar');
        $progress.attr('aria-valuenow', 0);
        xhr.upload.addEventListener("progress", function (evt) {
            if (evt.lengthComputable) {
                var percentComplete = evt.loaded / evt.total;
                D.log(percentComplete);
                $progress.attr('aria-valuenow', parseInt(percentComplete * 100));
            }
        }, false);
        xhr.addEventListener("progress", function (evt) {
            D.log(evt);
            if (evt.lengthComputable) {
                var percentComplete = evt.loaded / evt.total;
                D.log(percentComplete);
            }
        }, false);
        return xhr;
    }
};

var D = {
    debug: true,
    log: function(message) {
        if (D.debug) {
            console.log(message);
        }
    }
};
// D.debug = false;