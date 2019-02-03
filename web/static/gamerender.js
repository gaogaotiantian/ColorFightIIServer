
var WIDTH = 960,
	HEIGHT = 960;
let pixi_app = new PIXI.Application({width: WIDTH, height: HEIGHT, antialias: true});

rgb2hex = PIXI.utils.rgb2hex;
Graphics = PIXI.Graphics;

// Globals
const CELL_SIZE = WIDTH/30;
const TERRAIN_COLOR = rgb2hex([34/255, 139/255, 34/255]);
const GOLD_COLOR = rgb2hex([255/255, 215/255, 0/255]);
const ENERGY_COLOR = rgb2hex([30/255, 144/255, 255/255]);

// Utilities
// Colors
var colors = ['#DDDDDD', '#E6194B', '#3Cb44B', '#FFE119', '#0082C8', '#F58231', 
	'#911EB4', '#46F0F0', '#F032E6', '#D2F53C', '#008080', 
	'#AA6E28', '#800000', '#AAFFC3', '#808000', '#000080', '#FABEBE', '#E6BEFF'];
var COLORS = [];
for (var color of colors) {
	var r = parseInt('0x'+color.substring(1, 3));
	var g = parseInt('0x'+color.substring(3, 5));
	var b = parseInt('0x'+color.substring(5, 7));
	COLORS.push({r: r, g: g, b: b});
}
const getRandomColor = () => {
	var r = Math.floor(Math.random()*255);
	var g = Math.floor(Math.random()*255);
	var b = Math.floor(Math.random()*255);
	return {r: r, g: g, b: b};
}
const generateColor = (n) => {
	if (n===0)
		return {r: 221, g: 221, b: 221};
	if (n < COLORS.length) {
		return COLORS[n];
	} else {
		while (COLORS.length <= n) {
			COLORS.push(getRandomColor());
		}
		return COLORS[n];
	}
}

// Update functions
const update_frame = function(data) {
	gamemap.load(data);
}

// Game Map
class Map {
	// width, height = num of cell
	constructor(width, height){
		this.width = width;
		this.height = height;
		this.cells = [];
		this.turn = 0;
		this.display_mode = 0;
	}
	// display the cells
	draw(){
		this.clear();
		switch(this.display_mode){
			case 0: 
				for (const cell of this.cells) {
					cell.draw();
				}
				break;
			case 1: 
				for (const cell of this.cells) {
					cell.showTerrain();
				}
				break;
			case 2:
				for (const cell of this.cells) {
					cell.showGold();
				}
				break;
			case 3:
				for (const cell of this.cells) {
					cell.showEnergy();
				}
				break;
		}
	}
	// clear the stage
	clear(){
		while (pixi_app.stage.children[0]) {
			pixi_app.stage.removeChild(pixi_app.stage.children[0]);
		}
	}
	// show terrain
	showTerrain(){
		this.display_mode = 1;
		this.draw();
	}
	// show gold
	showGold(){
		this.display_mode = 2;
		this.draw();
	}
	// show energy
	showEnergy(){
		this.display_mode = 3;
		this.draw();
	}
	// load data
	load(data){
		this.turn = data.turn;
		this.cells = [];
		//cellcounts = [];
		for (const list of data.game_map)
			for (const item of list)
				//console.log(item.owner);
				this.cells.push(new Cell(item.position, item.building, item.attack_cost, 
				item.owner, item.gold, item.energy, item.natural_cost, item.force_field));
		this.draw();
	}
	
}

// Cells
class Cell {
	constructor(position, building, attack_cost, owner, gold, energy, natural_cost, force_field){
		this.position = position;
		this.size = CELL_SIZE;
		this.building = building;
		this.attack_cost = attack_cost;
		this.owner = owner;
		this.gold = gold;
		this.energy = energy;
		this.natural_cost = natural_cost;
		this.force_field = force_field;
		//this.owner = Math.floor(Math.random()*10);
	}
	draw(){
		var s = this.size * 0.5,
			x = this.position[0] * this.size + (this.size - s)/2,
			y = this.position[1] * this.size + (this.size - s)/2,
			radius = s / 5;
		let cell = new Graphics();
		let color = this.color();
		cell.beginFill(color[0], color[1]);
		cell.drawRoundedRect(x, y, s, s, radius);
		cell.endFill();
		cell.lineStyle(1, 0xFFFFFF, 1);
		cell.drawRoundedRect(x, y, s, s, radius);
		pixi_app.stage.addChild(cell);
	}
	showTerrain(){
		let cell = new Graphics();
		cell.beginFill(TERRAIN_COLOR, (this.natural_cost/200)*0.5+0.5);
		cell.drawRect(this.position[0]*this.size, this.position[1]*this.size, this.size, this.size);
		cell.endFill();
		pixi_app.stage.addChild(cell);
		this.draw();
	}
	showGold(){
		let cell = new Graphics();
		cell.beginFill(GOLD_COLOR, this.gold/10);
		cell.drawRect(this.position[0]*this.size, this.position[1]*this.size, this.size, this.size);
		cell.endFill();
		pixi_app.stage.addChild(cell);
		this.draw();
	}
	showEnergy(){
		let cell = new Graphics();
		cell.beginFill(ENERGY_COLOR, this.energy/10);
		cell.drawRect(this.position[0]*this.size, this.position[1]*this.size, this.size, this.size);
		cell.endFill();
		pixi_app.stage.addChild(cell);
		this.draw();
	}
	color(){
		var a = (this.attack_cost/200) * 0.5 + 0.5;
		var color = generateColor(this.owner);
		var hex = rgb2hex([color.r/255, color.g/255, color.b/255]);
		return [hex, a];
	}
	
}

var gamemap;

pixi_setup = function(app) {
	app.renderer.backgroundColor = 0x111111;
}
$(function() {
	const wsURL = (window.location.protocol=='https:'&&'wss://'||'ws://') + window.location.host + '/game_channel';
	/*const wsURL = (window.location.protocol=='https://'&&'wss://'||'ws://') +
		'colorfightii.herokuapp.com' + '/game_channel';
	*/
	const conn = new WebSocket(wsURL);
	conn.onopen = () => {
		console.log('opened');
		gamemap = new Map(30, 30);
		document.body.appendChild(pixi_app.view);
		pixi_setup(pixi_app);
	};
	conn.onmessage = (e) => {
		update_frame(JSON.parse(e.data));
	};
})

