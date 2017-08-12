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
      
    document.getElementById('flushQueue').addEventListener('click', flushQueue);
  }
  
  updateQueue(){
    let elements = document.querySelectorAll('div#content>div.queue>div.queue-el');
    for (let i in elements) {
        if(elements.hasOwnProperty(i)){
          elements[i].classList.remove('playing');
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
