'use strict';
var content = document.getElementById('content');
var youtube = content.getElementsByClassName('youtube')[0];

function addVideoClickEvent(item) {
    item.addEventListener('click', () => {
        var videoid = item.getAttribute('data-videoid');
        var oReq = new XMLHttpRequest();
        oReq.addEventListener('load', () => {
            if (oReq.status === 200) {
                var json = null;
                try {
                    json = JSON.parse(oReq.responseText);
                } catch (e) {
                    console.log('Unable to parse JSON: ' + e);
                    return;
                }
                if (json.length === 0) {
                    return;
                }
                if (json.success === true) {
                    window.ui._playManager.playMp3(json.result.url, {
                        title: json.result.title,
                        artist: 'YouTube',
                        album: '',
                        albumArt: json.result.thumbnail,
                        duration: json.result.duration
                    });
                }
            }
        });
        oReq.open('GET', '/plugins/youtube/resolve/' + encodeURIComponent(videoid));
        oReq.send();
    });
}

function loadAllVideos() {
    var section = youtube.getElementsByClassName('section')[0];
    var oReq = new XMLHttpRequest();
    oReq.addEventListener('load', () => {
        if (oReq.status === 200) {
            var json = null;
            try {
                json = JSON.parse(oReq.responseText);
            } catch (e) {
                console.log('Unable to parse JSON: ' + e);
                return;
            }
            if (json.length === 0) {
                return;
            }

            for (var i = 0; i < json.length; i++) {
                var element = document.createElement('div');
                element.classList.add('playlist');

                var thumbnailEl = document.createElement('img');
                thumbnailEl.classList.add('thumb');
                thumbnailEl.src = json[i].thumbnails.medium.url;
                element.appendChild(thumbnailEl);

                var contentEl = document.createElement('div');
                contentEl.classList.add('content');

                var titleEl = document.createElement('div');
                titleEl.classList.add('title');
                titleEl.innerHTML = json[i].name;
                contentEl.appendChild(titleEl);

                if (json[i].description !== '') {
                    var descriptionEl = document.createElement('p');
                    descriptionEl.classList.add('description');
                    contentEl.appendChild(descriptionEl);
                }

                if (json[i].items.length !== 0) {
                    var plitems = document.createElement('div');
                    plitems.classList.add('pl-items');
                    console.log(json[i].items);
                    for (var i2 = 0; i2 < json[i].items.length; i2++) {
                        if (!json[i].items.hasOwnProperty(i2)) {
                            continue;
                        }

                        var theItem = json[i].items[i2].snippet;

                        if (theItem.title === 'Deleted video' && theItem.description === 'This video is unavailable.' || theItem.thumbnails === undefined) {
                            continue;
                        }
                        var plitem = document.createElement('div');
                        plitem.classList.add('pl-item');
                        plitem.setAttribute('data-videoid', theItem.resourceId.videoId);
                        addVideoClickEvent(plitem);

                        var plitem_img = document.createElement('img');
                        plitem_img.classList.add('pl-item-img');
                        plitem_img.src = theItem.thumbnails.default.url;
                        plitem.appendChild(plitem_img);

                        var plitem_content = document.createElement('div');
                        plitem_content.classList.add('pl-item-content');

                        var plitem_title = document.createElement('div');
                        plitem_title.classList.add('pl-item-tilte');
                        plitem_title.innerHTML = theItem.title;
                        plitem_content.appendChild(plitem_title);

                        plitem.appendChild(plitem_content);
                        plitems.appendChild(plitem);
                    }

                    contentEl.appendChild(plitems);
                }

                element.appendChild(contentEl);
                section.appendChild(element);
            }
        }
    });
    oReq.open('GET', '/plugins/youtube/category/music');
    oReq.send();
}

loadAllVideos();