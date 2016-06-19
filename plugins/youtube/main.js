'use strict';
(() => {
    var fs = require('fs');
    var express = require('express');
    var youtube = new(require('youtube-node'))();
    var youtubedl = require('youtube-dl');
    var ffmpeg = require('fluent-ffmpeg');
    var moment = require('moment');
    youtube.setKey('AIzaSyCEyw0VMAQBNTWZNZmEfb0DJDi0IA2Ew00');
    class YouTube {
        constructor(SonosWeb) {
            SonosWeb.app.use('/plugins/youtube/', express.static(__dirname + '/client'));
            SonosWeb.app.get('/plugins/youtube/category/music', (req, res) => {
                youtube.searchByChannel('UC-9-kyTW8ZkZNDHQJ6FgpwQ', 50, (error, result) => {
                    // Music
                    if (error || !result.hasOwnProperty('items')) {
                        console.log(error);
                        res.json({
                            success: false,
                            error: {
                                code: 1,
                                text: 'Unable to fetch Music channel'
                            }
                        });
                        return;
                    }
                    if (result.items.length === 0) {
                        res.json({
                            success: false,
                            error: {
                                code: 2,
                                text: 'No items'
                            }
                        });
                        return;
                    }
                    var promArr = [];
                    var createPromise = (i) => {
                        return new Promise((resolve) => {
                            youtube.getPlayListsItemsById(result.items[i].id.playlistId, (err, res) => {
                                if (!err) {
                                    console.log(res);
                                    resolve({
                                        name: result.items[i].snippet.title,
                                        thumbnails: result.items[i].snippet.thumbnails,
                                        description: result.items[i].snippet.description,
                                        items: res.items
                                    });
                                } else {
                                    console.log(err);
                                    resolve(null);
                                }
                            });
                        });
                    };

                    for (var i = 0; i < result.items.length; i++) {
                        if (result.items[i].id.kind === 'youtube#playlist') {
                            var promise = createPromise(i);
                            promArr.push(promise);
                        }
                    }

                    Promise.all(promArr).then((data) => {
                        res.json(data);
                    });
                });
            });

            SonosWeb.app.get('/plugins/youtube/resolve/:videoid', (req, res) => {
                var videoid = req.params.videoid.toString();
                var matches = videoid.match(/^[0-9A-z\_\-]{11}$/i);
                console.log(matches, videoid);
                if (!matches) {
                    res.json({
                        success: false,
                        error: {
                            code: 1,
                            text: 'Invalid video id'
                        }
                    });
                    return;
                }

                youtube.getById(videoid, (err, result) => {
                    if (err) {
                        res.json({
                            success: false,
                            error: {
                                code: 2,
                                text: 'Unable to get infos for the provided videoId'
                            }
                        });
                        return;
                    }
                    var protocol = 'http://';
                    if (result.hasOwnProperty('items') && result.items.length !== 0) {
                        var video = result.items[0];
                        var bestQ = null;
                        for (var i in video.snippet.thumbnails) {
                            if (video.snippet.thumbnails.hasOwnProperty(i)) {
                                bestQ = video.snippet.thumbnails[i].url;
                            }
                        }
                        res.json({
                            success: true,
                            result: {
                                title: video.snippet.title,
                                thumbnail: bestQ,
                                duration: moment.duration(video.contentDetails.duration).asSeconds(),
                                url: protocol + SonosWeb._ipaddress + ':' + SonosWeb.port + '/plugins/youtube/play/' + videoid
                            }
                        });
                    } else {
                        res.json({
                            success: false,
                            error: {
                                code: 3,
                                text: 'Video not found'
                            }
                        });
                        return;
                    }
                });

            });

            SonosWeb.app.get('/plugins/youtube/play/:videoid', (req, res) => {
                var videoid = req.params.videoid.toString();
                console.log('Requested to play ' + videoid);
                var matches = videoid.match(/^[0-9A-z\_\-]{11}$/i);
                console.log(matches, videoid);
                if (!matches) {
                    res.json({
                        success: false,
                        error: {
                            code: 1,
                            text: 'Invalid video id'
                        }
                    });
                    return;
                }

                var video = youtubedl('https://youtube.com/watch?v=' + videoid);
                video.on('info', (info) => {
                    console.log(info);
                });
                video.on('error', () => {
                    console.log('error!');
                });
                video.on('end', () => {
                    console.log('Video download finished');
                    //this.serveMp3(videoid, res);
                });
                //video.pipe(fs.createWriteStream(__dirname + '/cached/' + videoid + '.mp4'));
                var logger = {
                    debug: console.log,
                    info: console.log,
                    error: console.log,
                    warn: console.log
                };

                res.setHeader('Content-Length', 1024 * 1024 * 1024 * 4); // What a bad workaround! We can stream up to 4GB
                res.setHeader('Content-Type', 'audio/mpeg');

                ffmpeg(video, {
                        logger: logger
                    })
                    .videoCodec('libx264')
                    .outputFormat('mp3')
                    .on('end', function() {
                        console.log('[ffmpeg] File converted successfully]');
                    })
                    .on('error', function(err) {
                        console.log('[ffmpeg] Error while converting video: ' + err.message);
                    })
                    .pipe(res, {
                        end: true
                    });



            });

            SonosWeb.app.get('/pages/youtube', (req, res) => {
                res.render('../../plugins/youtube/server/pages/main');
            });
            SonosWeb.addMenuEntry('fa-youtube-play', 'YouTube', 'youtube', 4000);
        }

        isVideoCached(videoid) {
            try {
                var fstat = fs.statSync(__dirname + '/cached/' + videoid + '.mp4');
                console.log(fstat, fstat.isFile());
                if (fstat.isFile()) {
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            }
        }

    }
    module.exports = YouTube;
})();