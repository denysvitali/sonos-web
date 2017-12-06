'use strict';

class Queue {
  
  constructor(ui) {
      this._ui = ui;
  }
  
  run(){
    window.ui = this._ui;
    let me = this;
    
    window.ui.on('queue', ()=>{
      if(SonosStatus.positionInQueue === 0 && SonosStatus.totalQueue === 0 && document.querySelectorAll('div#content>div.queue>div.queue-el').length !== 0){
        me.clearUIQueue();
      }
      me.updateQueue();
    });
    this.updateQueue();
    
    
    let flushQueue = ()=>{
      window.ui._socket.emit('do_flushqueue');
      me.clearUIQueue();
    };

    let playQueue = () => {
      window.ui._socket.emit('do_playqueue');
    }
      
    document.getElementById('flushQueue').addEventListener('click', flushQueue);
    document.getElementById('playQueue').addEventListener('click', playQueue);
  }
  
  updateQueue(){
    let elements = document.querySelectorAll('div#content>div.queue>div.queue-el');
    for (let i in elements) {
        if(elements.hasOwnProperty(i)){
          elements[i].classList.remove('playing');
          elements[i].addEventListener('click', ()=>{
              console.log(`Play queue element ${i*1+1}`);
              window.ui._socket.emit('do_playqueueelement', {track: i*1+1});
              window.ui.toastMessage(`Playing element ${i*1+1} of the queue`);
          });
        }
    }
    let el = document.querySelector('div#content>div.queue>div.queue-el:nth-child(0n + ' + window.SonosStatus.positionInQueue + ')');
    if (el !== null){
      el.classList.add('playing');
    }
  }
  
  clearUIQueue(){
    let elements = document.querySelectorAll('div#content>div.queue>div.queue-el');
    for (let i in elements) {
        if(elements.hasOwnProperty(i)){
          elements[i].parentNode.removeChild(elements[i]);
        }
    }
  }

}

export
default Queue;
