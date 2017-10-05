'use strict';
(() => {
	const fs = require('fs');
	const youtube = new(require('youtube-node'))();
	const youtubedl = require('youtube-dl');
	const ffmpeg = require('fluent-ffmpeg');
	const moment = require('moment');
	const request = require('request');
	const rp = require('request-promise');
	youtube.setKey('AIzaSyCEyw0VMAQBNTWZNZmEfb0DJDi0IA2Ew00');
	class YouTube {
		constructor(SonosWeb, settings) {
			SonosWeb.app.use('/plugins/youtube/', SonosWeb.express.static(__dirname + '/client'));
			SonosWeb.app.use('/plugins/youtube/search/:q', (req, res) => {
				if (req.params.q !== '') {
					youtube.search(req.params.q, 10, (err, result) => {
						res.json(result);
					});
					return;
				}
				res.end('fail');
			});

			SonosWeb.app.get('/plugins/youtube/category/music', (req, res) => {
				youtube.searchByChannel('UC-9-kyTW8ZkZNDHQJ6FgpwQ', 50, (error, result) => {
					console.log('Got an answer [YT]');

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
					let promArr = [];
					let createPromise = (i) => {
						return new Promise((resolve) => {
							youtube.getPlayListsItemsById(result.items[i].id.playlistId, (err, res) => {
								if (!err) {
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

					for (let i = 0; i < result.items.length; i++) {
						if (result.items[i].id.kind === 'youtube#playlist') {
							let promise = createPromise(i);
							promArr.push(promise);
						}
					}

					Promise.all(promArr).then((data) => {
						res.json(data);
					});
				});
			});

			SonosWeb.app.get('/plugins/youtube/resolve/:videoid', (req, res) => {
				let videoid = req.params.videoid.toString();
				let matches = videoid.match(/^[0-9A-z\_\-]{11}$/i);
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
					let protocol = 'http://';
					if (result.hasOwnProperty('items') && result.items.length !== 0) {
						let video = result.items[0];
						let bestQ = null;
						for (let i in video.snippet.thumbnails) {
							if (video.snippet.thumbnails.hasOwnProperty(i)) {
								bestQ = video.snippet.thumbnails[i].url;
							}
						}
						let videoUrl = '';
						if (settings.external_provider !== true || true) {
							videoUrl = protocol + SonosWeb._ipaddress + ':' + SonosWeb.port + '/plugins/youtube/play/' + videoid;
						} else {
							// Never reached, this is a better choice, but apparently Sonos doesn't accept redirects (or has an URL limit, I guess)
							// We'll use the Node Server as a proxy (less efficient, but better than nothing)
							videoUrl = `https://www.youtubeinmp3.com/fetch/?video=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${videoid}`;
						}

						res.json({
							success: true,
							result: {
								title: video.snippet.title,
								author: video.snippet.channelTitle,
								thumbnail: bestQ,
								duration: moment.duration(video.contentDetails.duration).asSeconds(),
								url: videoUrl
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
				let videoid = req.params.videoid.toString();
				let matches = videoid.match(/^[0-9A-z\_\-]{11}$/i);
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

				console.log('Video ID: ' + videoid);

				if (settings.external_provider !== true) {

					let video = youtubedl('https://youtube.com/watch?v=' + videoid, ['-f bestaudio']);
					let filesize = 0;
					video.on('info', (info) => {
						filesize = info.size;

						let logger = {
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
							.withAudioBitrate('320k')
							.on('end', function () {
								console.log('[ffmpeg] File converted successfully]');
							})
							.on('error', function (err) {
								console.log('[ffmpeg] Error while converting video: ' + err.message);
							})
							.pipe(res, {
								end: true
							});
					});
					video.on('error', (error) => {
						console.log('Error while downloading video: ', error);
					});
					video.on('end', () => {
						console.log('Video download finished');
						//this.serveMp3(videoid, res);
					});
					//video.pipe(fs.createWriteStream(__dirname + '/cached/' + videoid + '.mp4'));
				} else {
					res.setHeader('Content-Type', 'audio/mpeg');
					
					let qs = {
						'callback': 'jQuery',
						'idv': videoid,
						'type': 'mp3',
						'qu': '256',
						'title': 'Video',
						'server': 'http://d1.ytcore.org/'
					};
					
					rp.get({
						url: `http://break.tv/video/${videoid}`
					}, (err,res, body)=>{

						let matches = body.match(/\'salt\': \'(.*?)\'/);
						if(matches){
							let salt = matches[1];
							SonosWeb.debug(`[YT - BreakTV] Got salt: ${salt}`);
							qs.salt = salt;
						}
					}).then((resolve, reject)=>{
						request.get(
							{
								url: `http://d1.ytcore.org/widget/dl.php`,
								qs: qs,
								headers:
								{
									'Referer': `http://break.tv/widget/mp3/?link=https://www.youtube.com/watch?v=${videoid}`,
									'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:57.0) Gecko/20100101 Firefox/57.0',
								}
							},
							(err, resp, body)=>{
								if(err){
									SonosWeb.debug(`Got an error: ${err}`);
									res.end();
									return;
								}
	
								SonosWeb.debug("[YT - BreakTV] No errors");
	
								let regex = new RegExp('jQuery\\((.*?)\\)$');
								let matches = body.match(regex);
	
								if(matches){
									let json = JSON.parse(matches[1]);
									let jobid = json.success;
										
									if(jobid != false){
										SonosWeb.info(`[YT - BreakTV] YT video is available, job is ${jobid}`);
										res.setHeader('Content-Length', 1024 * 1024 * 1024 * 4); // What a bad workaround! We can stream up to 4GB
										res.setHeader('Content-Type', 'audio/mpeg');
										request.get(`http://d1.ytcore.org/sse/?jobid=${jobid}`).pipe(res);
										return;
									} else {
										SonosWeb.warn(json);
									}
								}
	
								res.end();
						});
					})
				}

			});

			SonosWeb.app.get('/pages/youtube', (req, res) => {
				res.render('../../plugins/youtube/server/pages/main');
			});
			SonosWeb.addMenuEntry('fa-youtube-play', 'YouTube', 'youtube', 4000);
		}

		isVideoCached(videoid) {
			try {
				let fstat = fs.statSync(__dirname + '/cached/' + videoid + '.mp4');
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