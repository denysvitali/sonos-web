'use strict';
var content = document.getElementById('content');
var youtube = content.getElementsByClassName('youtube')[0];


var resWindow = null;
var resWindowShown = false;

function loadSearchbar() {
    var searchBar = youtube.getElementsByClassName('searchbar')[0];

    var createResWindow = () => {
        if (resWindow === null) {
            resWindow = document.createElement('div');
            resWindow.setAttribute('id', 'yt_reswindow');
            resWindow.classList.add('youtube');
            resWindow.classList.add('yt-reswindow');
            youtube.appendChild(resWindow);
            console.log(searchBar.offsetTop, searchBar.offsetLeft, searchBar.offsetWidth, resWindow.style.top);
            resWindow.style.top = (searchBar.offsetTop + searchBar.offsetHeight) + 'px';
            resWindow.style.left = searchBar.offsetLeft + 'px';
            resWindow.style.width = searchBar.offsetWidth + 'px';
            resWindowShown = true;
        }
        resWindow.innerHTML = '';
    };

    var addToResultList = (videoid, artwork, title, author) => {
        var resultEntry = document.createElement('div');
        resultEntry.classList.add('yt-reswindow-result');
        resultEntry.setAttribute('data-videoid', videoid);

        var resultEntry_img = document.createElement('img');
        resultEntry_img.classList.add('yt-reswindow-result-img');
        resultEntry_img.src = artwork;

        var resultEntry_text = document.createElement('div');
        resultEntry_text.classList.add('yt-reswindow-result-textcontainer');

        var resultEntry_text_title = document.createElement('div');
        resultEntry_text_title.classList.add('yt-reswindow-result-title');
        resultEntry_text_title.textContent = title;

        var resultEntry_text_author = document.createElement('div');
        resultEntry_text_author.classList.add('yt-reswindow-result-author');
        resultEntry_text_author.textContent = author;

        resultEntry_text.appendChild(resultEntry_text_title);
        resultEntry_text.appendChild(resultEntry_text_author);

        resultEntry.appendChild(resultEntry_img);
        resultEntry.appendChild(resultEntry_text);

        addVideoClickEvent(resultEntry);

        resWindow.appendChild(resultEntry);

    };

    searchBar.addEventListener('keyup', () => {
        var oReq = new XMLHttpRequest();
        oReq.addEventListener('load', () => {
            if (oReq.status === 200) {
                var json = {
                    results: []
                };
                try {
                    json = JSON.parse(oReq.responseText);
                } catch (e) {
                    console.log('Unable to parse JSON', e);
                }
                if (json.items.length !== 0) {
                    createResWindow();
                    for (var i in json.items) {
                        if (json.items.hasOwnProperty(i)) {
                            if (json.items[i].id.kind === 'youtube#video') {
                                addToResultList(
                                    json.items[i].id.videoId,
                                    json.items[i].snippet.thumbnails.default.url,
                                    json.items[i].snippet.title,
                                    json.items[i].snippet.channelTitle
                                );
                            }
                        }
                    }
                } else {
                    if (resWindow !== null) {
                        resWindow.parentElement.removeChild(resWindow);
                        resWindow = null;
                    }
                }
            }
        });
        oReq.open('GET', '/plugins/youtube/search/' + encodeURIComponent(searchBar.value), true);
        oReq.send();
    });


}

function addVideoClickEvent(item) {

    var videoClick = () => {
        console.log('Video clicked!');
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
                        artist: json.result.author + ' - YouTube',
                        album: '',
                        albumArt: json.result.thumbnail,
                        duration: json.result.duration
                    });
                }
            }
        });
        oReq.open('GET', '/plugins/youtube/resolve/' + encodeURIComponent(videoid));
        oReq.send();
    };

    item.addEventListener('click', videoClick);
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
loadSearchbar();
loadAllVideos();
