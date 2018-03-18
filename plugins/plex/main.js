'use strict';
(() => {
	const PlexAPI = require('plex-api');
	const queryString = require('query-string');
	const proxy = require('express-http-proxy');
	const { URL } = require('url');
	let client;
	let libraries = [];
	class Plex {
		constructor(SonosWeb, settings) {
			SonosWeb.app.use('/plugins/plex/', SonosWeb.express.static(__dirname + '/client'));
			SonosWeb.app.use('/pages/plex/', (req, res) => {
                res.render('../../plugins/plex/server/pages/main');
            });
			SonosWeb.addMenuEntry('fa-play-circle', 'Plex', 'plex', 2000);
			
			client = new PlexAPI({
				hostname: settings.hostname,
				https: true,
				token: settings.token
			});

			client.query('/').then((result)=>{
				return client.query('/library/sections');
			})
			.then((result)=>{
				for(let i in result.MediaContainer.Directory){
					if(result.MediaContainer.Directory.hasOwnProperty(i)){
						let el = result.MediaContainer.Directory[i];
						if(el.type === 'artist'){ // Music Library
							libraries.push(el);
						}
					}
				}
			})
			.then(()=>{
				SonosWeb.debug(`[Plex] Found ${libraries.length} music libraries.`);
				return client.query(`/library/sections/${libraries[0].key}`);
			})
			.catch((reject)=>{
				console.log(reject);	
			});

			SonosWeb.app.use('/plugins/plex/api/libraries', (req, res) => {
				res.json(libraries);
			});
			
			SonosWeb.app.use('/plugins/plex/api/', proxy(`https://${settings.hostname}:32400/`, {
				proxyReqPathResolver: (req) => {
					let newUrl = new URL(req.path, `https://${settings.hostname}:32400`);
					newUrl.searchParams.set('X-Plex-Token', settings.token);
					return `${newUrl.pathname}${newUrl.search}`;
				},
				proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
					proxyReqOpts.headers['Accept'] = 'application/json';
					return proxyReqOpts;
				}
			}));
		}
	}
	module.exports = Plex;
})();