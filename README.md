# sonos-web
This project is still in development, therefore the features may be buggy and / or limited
![sonos-web-ui](https://denv.it/public/sonos-web-ui-20160820.jpg)
## Description
sonos-web is a web interface for the Sonos Audio System,
created with the goal of having a nice looking interface to manage the queue, add streaming services like Spotify (even for non-premium users!) and allow other developers to customized the UX as they want by making the project expandable through plugins.

## Setup

### First things first
To use sonos-web you need:
- [Node.js](https://nodejs.org/) (v6.x+)
- Git
- A [Sonos Audio System](https://www.sonos.com/)
- An internet browser (Firefox is recommended)
- ffmpeg (in order to use the YouTube plugin)

### Instructions
1. Clone the repo  
`git clone https://github.com/denysvitali/sonos-web`
2. cd to the newly created folder (should be named `sonos-web`)  
`cd sonos-web/`
3. Install the dependencies  
`npm install`
4. Install gulp systemwide  
`npm install -g gulp`
5. Start the server  
`npm start`
6. See if it works, visit [http://localhost:8888/](http://localhost:8888/) or visit http://your-server-ip:8888/ from another location

Note: It may be required to `cd` into each plugins/ folder and do an `npm install` to make sure everything works.
YouTube requires ffmpeg to be installed on your system.

## Plugins
This is a list of planned plugins

Status:
✅ Available, ❎ Not available
- Spotify ❎
- Google Play Music ❎
- Soundcloud ✅
- YouTube ✅

### Party
Show your currently playing track with the "Party" plugin, already included in Sonos Web
![party-plugin](https://denv.it/public/sonos-web-party-20160521.jpg)

## TODO
1. Complete the UI | Partially done
2. Interact with Sonos system | Partially done
3. Provide public methods for the plugins
4. Write the plugins | Partially done
5. Document everything


## Older screenshots
### 2016-06-04
![sonos-web-ui](https://denv.it/public/sonos-web-ui-20160604.jpg)
### 2016-05-10
![sonos-web-ui](https://denv.it/public/sonos-web-ui-20160510.jpg)
### 2016-03-20
![sonos-web-ui](https://denv.it/public/sonos-web-ui-20160320.jpg)
### 2016-03-14
![sonos-web-ui](https://denv.it/public/sonos-web-ui-20160314.jpg)
