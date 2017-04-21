'use strict';
class UIDebugEv{
	constructor(ui){
		this._ui = ui;
		this.elements = {};
		this.elements.roomSelector = document.querySelector('.debug>div.select-room>select');
	}

	run(){
		console.log('run()',this.elements.roomSelector);
		this.elements.roomSelector.addEventListener('change', ()=>{
			var value = document.querySelector('.debug>div.select-room>select>option:checked').value;
			console.log(value);
			this._ui.autoHeroMenuImage(value);
		});

		document.querySelector('.debug button#getTrack').addEventListener('click', ()=>
		{
				this._ui._socket.on('track', (data)=>{
						document.querySelector('.debug pre#trackRes').innerHTML = JSON.stringify(data);
				});
				this._ui._socket.emit('get_track');
		});

		this._ui._socket.on('zoneInfo', (data)=>{
			console.log('Got ZoneInfo');
			console.log(data);
		});
		this._ui._socket.emit('get_zoneInfo');
		console.log(this._ui);
	}
}

export default UIDebugEv;
