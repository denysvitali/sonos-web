'use strict';
(() => {
    var util = require('util');
    var fs = require('fs');
    var express = require('express');
    var youtube = new(require('youtube-node'))();
    var youtubedl = require('youtube-dl');
    var ffmpeg = require('fluent-ffmpeg');
    var moment = require('moment');
    youtube.setKey('AIzaSyCEyw0VMAQBNTWZNZmEfb0DJDi0IA2Ew00');
    /*youtube.search('Denys Vitali', 5, (error, result) => {
        if (!error) {
            console.log(result);
        }
    });*/

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
                        console.log(video.snippet);

                        if(!this.isVideoCached(videoid))
                        {
                          var videoD = youtubedl('https://youtube.com/watch?v=' + videoid);
                          videoD.on('info', (info) => {
                              console.log(info);
                          });
                          videoD.on('error', () => {
                              console.log('Video download failed!');
                              res.json({
                                  success: true,
                                  result: {
                                      title: video.snippet.title,
                                      thumbnail: (video.snippet.thumbnails.hasOwnProperty('maxres') ? video.snippet.thumbnails.maxres.url : video.snippet.thumbnails.default.url),
                                      duration: moment.duration(video.contentDetails.duration).asSeconds(),
                                      url: null
                                  }
                              });
                          });
                          videoD.on('end', () => {
                              console.log('Video download finished');
                              res.json({
                                  success: true,
                                  result: {
                                      title: video.snippet.title,
                                      thumbnail: (video.snippet.thumbnails.hasOwnProperty('maxres') ? video.snippet.thumbnails.maxres.url : video.snippet.thumbnails.default.url),
                                      duration: moment.duration(video.contentDetails.duration).asSeconds(),
                                      url: protocol + SonosWeb._ipaddress + ':' + SonosWeb.port + '/plugins/youtube/play/' + videoid
                                  }
                              });
                          });
                          videoD.pipe(fs.createWriteStream(__dirname + '/cached/' + videoid + '.mp4'));
                        }
                        else{
                          res.json({
                              success: true,
                              result: {
                                  title: video.snippet.title,
                                  thumbnail: (video.snippet.thumbnails.hasOwnProperty('maxres') ? video.snippet.thumbnails.maxres.url : video.snippet.thumbnails.default.url),
                                  duration: moment.duration(video.contentDetails.duration).asSeconds(),
                                  url: protocol + SonosWeb._ipaddress + ':' + SonosWeb.port + '/plugins/youtube/play/' + videoid
                              }
                          });
                          return;
                        }
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
                if (this.isVideoCached(videoid)) {
                    this.serveMp3(videoid, res);
                } else {
                    var video = youtubedl('https://youtube.com/watch?v=' + videoid);
                    video.on('info', (info) => {
                        console.log(info);
                    });
                    video.on('error', () => {
                        console.log('error!');
                    });
                    video.on('end', () => {
                        console.log('Video download finished');
                        this.serveMp3(videoid, res);
                    });
                    video.pipe(fs.createWriteStream(__dirname + '/cached/' + videoid + '.mp4'));
                    return;
                }



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

        serveMp3(videoid, res) {
            var logger = {
                debug: console.log,
                info: console.log,
                error: console.log,
                warn: console.log
            };
            res.setHeader('Content-Length', 8573492); // What a bad workaround!
            res.setHeader('Content-Type', 'audio/mpeg');
            ffmpeg({
                    logger: logger
                })
                .input(fs.createReadStream(__dirname + '/cached/' + videoid + '.mp4'))
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
        }

    }
    module.exports = YouTube;
})();