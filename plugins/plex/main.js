'use strict';
(() => {
	const PlexAPI = require('plex-api');
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
				console.log(result);
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
				console.log(libraries[0]);
				return client.query(`/library/sections/${libraries[0].key}`);
			})
			.then((result)=>{
				console.log(result);
				console.log(result.MediaContainer.Directory);
			})
			.catch((reject)=>{
				console.log(reject);	
			});

			SonosWeb.app.use('/plugins/plex/api/libraries', (req, res) => {
				res.json(libraries);
			});

			SonosWeb.app.use(['/plugins/plex/api/*'], (req, res) => {
				/*let found = false;
				for(let i in libraries){
					if(libraries.hasOwnProperty(i)){
						let el = libraries[i];
						if(req.params.id == el.key){
							found = true;
							break;
						}
					}
				}

				if(!found){
					res.json({
						error: true,
						message: 'This library isn\'t available or is not a Music library'
					});
					return;
				}*/

				client.query('/' + req.params[0])
				.then((result)=>{
					if(result.MediaContainer !== undefined){
						res.json(result);
					} else {
						res.end(result);
					}
				}).catch((error)=>{
					console.log(error);
					res.json({
						error: true,
						message: 'Unable to get the requested library',
					});
				});
			});
		}
	}
	module.exports = Plex;
})();