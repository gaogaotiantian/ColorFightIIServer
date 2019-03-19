/* GAME CONSTANTS */
var LOGO_HEIGHT = 10,
    LOGO_WIDTH = 46;

/* GAME VARIABLES */
var animationStartTime = false,
    animationProgress,
    gameWidth = 960,
    cellSize = 32,
    cellRadius = 7,
    currentCell;

/* DOM VARIABLES */
var gameColumn = document.getElementById( "cf-game-col" ),
    gameRow = document.getElementById( "cf-game-row" ),
    gameDiv = document.getElementById( "game-div" ),
    gameTurn = document.getElementById( "turn-stat" );

/* PIXI VARIABLES */
var Graphics = PIXI.Graphics,
    gameStage = new PIXI.Stage( parseInt( "000000", 16 ), true ),
    gameRenderer = PIXI.autoDetectRenderer( gameWidth, gameWidth );

/* WEBSOCKET VARIABLES */
var gameProtocol = window.location.protocol=='https:'&&'wss://'||'ws://',
    gameSocket = new WebSocket( gameProtocol + window.location.host + "/game_channel" ),
    gameData = false,
    lastTurn = -1;

/* Appending the PIXI renderer to the DOM */
function init_page() {
    document.getElementById( "game-div" ).appendChild( gameRenderer.view );
}

/* Utilities */
get_random_color = function() {
    var r = ( "0" + Math.floor( Math.random() * 255 ).toString( 16 ) ).slice( -2 ).toUpperCase();
    var g = ( "0" + Math.floor( Math.random() * 255 ).toString( 16 ) ).slice( -2 ).toUpperCase();
    var b = ( "0" + Math.floor( Math.random() * 255 ).toString( 16 ) ).slice( -2 ).toUpperCase();
    return parseInt( r + g + b, 16 );
}

var ID_COLORS = [ 0xDDDDDD, 0xE6194B, 0x3Cb44B, 0xFFE119, 0x0082C8, 0xF58231,
                 0x911EB4, 0x46F0F0, 0xF032E6, 0xD2F53C, 0x008080, 0xAA6E28,
                 0x800000, 0xAAFFC3, 0x808000, 0x000080, 0xFABEBE, 0xE6BEFF ];

function id_to_color( uid ) {
    if( uid < ID_COLORS.length ) {
        return ID_COLORS[ uid ];
    } else {
        while( ID_COLORS.length <= uid ) {
            ID_COLORS.push( get_random_color() );
        }
        return ID_COLORS[ uid ];
    }
}

function hex_combine( src, dest, per ) {
    var isrc = parseInt( src, 16 );
    var idest = parseInt( dest, 16 );
    var curr = Math.floor( isrc + ( idest - isrc ) * per );
    return ( "0" + curr.toString( 16 ) ).slice( -2 ).toUpperCase();
}

function combine_color( src, dest, per ) {
    if( per < 0 ) per = 0;
    return parseInt( hex_combine( src.slice( 1, 3 ), dest.slice( 1, 3 ), per ) + hex_combine( src.slice( 3, 5 ), dest.slice( 3, 5 ), per ) + hex_combine( src.slice( 5 ), dest.slice( 5 ), per ), 16 );
}

/* Animation Loop */
function draw_game( ts ) {
    if( !animationStartTime ) animationStartTime = ts;
    animationProgress = animationStartTime - ts;
    gameWidth = gameColumn.clientWidth;
    if( gameWidth + gameRenderer.view.offsetTop > window.innerHeight ) {
        gameWidth = window.innerHeight - gameRow.offsetTop;
    }
    gameWidth -= 20;
    if( gameRenderer.view.width != gameWidth ) {
        gameDiv.setAttribute( "style", "width:" + gameWidth + "px;height:" + gameWidth + "px" );
        gameRenderer.view.style.width = ( gameWidth - 40 ) + "px";
        gameRenderer.view.style.height = ( gameWidth - 40 ) + "px";
        //cellSize = gameWidth / 30 - 4;
        //cellRadius = 7;
    }
    if( gameData && gameData[ "turn" ] != lastTurn ) {
        lastTurn = gameData[ "turn" ];
        gameTurn.innerHTML = lastTurn + "/500";
        while( gameStage.children[ 0 ] ) {
            gameStage.removeChild( gameStage.children[ 0 ] );
        }
        for( var y = 0; y < 30; y++ ) {
            for( var x = 0; x < 30; x++ ) {
                currentCell = gameData[ "game_map" ][ y ][ x ];
                draw_cell( x, y, currentCell );
            }
        }
        gameRenderer.render( gameStage );
    }
    requestAnimationFrame( draw_game );
}


/* Draw Cell */
function draw_cell( x, y, currentCell ) {
    let base = new Graphics();
    base.beginFill( combine_color( "#000000", "#65c9cf", currentCell[ "natural_energy" ] / 10 ) );
    base.drawRoundedRect( x * cellSize, y * cellSize, cellSize - 2, cellSize - 2, cellRadius );
    base.endFill();
    base.beginFill( combine_color( "#000000", "#faf334", currentCell[ "natural_gold" ] / 10 ) );
    base.drawRoundedRect( x * cellSize + 2, y * cellSize + 2, cellSize - 6, cellSize - 6, cellRadius - 2 );
    base.endFill();
    if( currentCell[ "owner" ] == 0 ) {
        base.beginFill( parseInt( "000000", 16 ) );
    } else {
        base.beginFill( id_to_color( currentCell[ "owner" ] ) );
    }
    base.drawRoundedRect( x * cellSize + 4, y * cellSize + 4, cellSize - 10, cellSize - 10, cellRadius - 4 );
    base.endFill();
    gameStage.addChild( base );
}

init_page();
window.requestAnimationFrame( draw_game );

gameSocket.onmessage = function( msg ) {
    gameData = JSON.parse( msg.data );
}

////////////////////////////////////////////////////////////////////////////////
// Web Client
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// Constants from constants.py

const GAME_WIDTH                = 30; 
const GAME_HEIGHT               = 30;
const GAME_MAX_TURN             = 500;

const GAME_MAX_NATURAL_GOLD     = 10;
const GAME_MAX_NATURAL_ENERGY   = 10;
const GAME_MAX_TECH             = 3; 
const GAME_SIEGE_PERCENT        = 5; 

const CMD_ATTACK        = 'a';
const CMD_BUILD         = 'b';
const CMD_UPGRADE       = 'u';
const BLD_GOLD_MINE     = 'g';
const BLD_ENERGY_WELL   = 'e';

////////////////////////////////////////////////////////////////////////////////

// Use a common color for ENERGY and GOLD related drawing. 
const ENERGY_COLOR          = "#65c9cf";
const GOLD_COLOR            = "#faf334";

// Derive the maximum board size. 
const GAME_MAX_CELLS        = GAME_WIDTH * GAME_HEIGHT;

////////////////////////////////////////////////////////////////////////////////

// TODO: Draw user list on left. 
// Draw self user on right under turn. (Join Game Button). 
// Draw specific user on right under self user. 
// Draw specific cell on right under specific user. 

function draw_user_list() {
    for (let uid in gameData['users']) {
        // [color box] username (dead/in-game)
        let user_info = gameData['users'][uid];

        // id_to_colors[uid];
        // user_info['username'];
        // user_info['dead'];
    }
}

function draw_specific_user_info(uid) {
    // [color box] username (dead/in-game)
    // tech_level
    // cells owned / total cells
    // energy +energy_source
    // gold   +gold_source
    let user_info = gameData['users'][uid]; 

    // id_to_colors[uid]; 
    // user_info['username'];
    // user_info['dead'];
    // user_info['tech_level']; 
    // user_info['cells'].length; + ' / ' + GAME_MAX_CELLS; 
    // user_info['energy'];
    // ' +' + user_info['energy_source'];
    // user_info['gold'];
    // ' +' + user_info['gold_source'];
}

function draw_specific_cell_info(x, y) {
    // x, y
    // [color box] owner
    // Level Building
    // energy   (base)
    // gold     (base)
    // attack_cost + (force_field - % siege loss)
    // 
    // if attackable: min attack, max attack, other attack
    // if buildable : mine or well (cost, old -> new)
    // if upgrade   : upgrade      (cost, old -> new)
    let cell_info   = gameData['game_map'][y][x];
    let ownerUID    = cell_info['owner'];

    // (x, y)
    // id_to_colors[ownerUID]; 
    // gameData['users'][ownerUID]['username'];
    // 'Level ' + String(cell_info['building']['level']) + ' ' + cell_info['building']['name'];

    // cell_info['gold'];
    // '(' + cell_info['natural_gold']   + ')';
    // cell_info['energy'];
    // '(' + cell_info['natural_energy'] + ')';

    // cell_info['natural_cost'];

    // let forceField = cell_info['force_field'];
    // if (forceField > 0) {
    //     // Iterate through adjacent looking for sieging. 
    //     let siegeCount      = 0;
    //     let adjacentCells   = GetAdjacentCells(x, y);
    //     for (adjacent in adjacentCells) {
    //         if (cell_info['owner'] != adjacent['owner']) {
    //             siegeCount += 1; 
    //         }
    //     }
    // }

    // if () {
    //     let client_info = gameData['users'][clientUID];
    // }
    // if (cell_info['owner'] == clientUID) {
    //     // We are the owner. Can we build or upgrade it. 
    //     if (cell_info['building']) {
    //         // There is a building. Draw upgrade. 
    //         // Handle max level and home not high enough level. 
    //     }
    //     else {
    //         // There is no building. Draw building choices. 
    //     }
    // }
    // else () {
    //     // We are not the owner. 
    //     if () {
    //         // We have at least one adjacent cell. We can attack. 
    //     }
    // }
}

////////////////////////////////////////////////////////////////////////////////

// Track the state of our action_channel websocket. 
let actionChannel = null; 

// TODO: Call this function when we click the join game button. 
function join_game(username, password) {
    // Open a socket to the action channel. 
    const actionSocket = new WebSocket(gameProtocol + window.location.host + "/action_channel" ); 

    // Register ourselves when the socket finishes initializing. 
    actionSocket.onopen = function() { 
        actionSocket.send(JSON.stringify(
            {
                'action'  : 'register', 
                'username': username, 
                'password': password
            }
        )); 
        // We now have an active channel that can accept commands.
        actionChannel = actionSocket;
    };
}

// TODO: We need to figure out our uid after we register. We can only do this 
// by checking the gameData after we successfully join the game. 

////////////////////////////////////////////////////////////////////////////////

// Create a single persistent structure for the command list. 
//
// We only need one because we can only send one command list per turn. 
// 
// We make it persistent because, even though we can only send one command 
// list per turn, we can send multiple commands per command list. Therefore, 
// we want to buffer all commands during a single turn into a single command 
// list so that we can send them all at once. 
const turnCommands = new Object({'action' : 'command', 'cmd_list': []});

// Send all of the commands we queued. 
// TODO: Call this function during {gameSocket.onmessage}
// if (actionChannel != NULL) { send_commands(); }
function send_commands() {
    // Send the command queue even if the command queue is empty because 
    // the server retries commands indefinitely, so we want to flush the 
    // queue on every turn to avoid leaving it with stale commands. 
    actionChannel.send(JSON.stringify(turnCommands));
    // Clear the command queue. 
    turnCommands.cmd_list = [];
}

////////////////////////////////////////////////////////////////////////////////
// Queue a command on a given cell. 
// (0, 0) is the top-left corner. 
// X from left. 
// Y from top. 

// TODO: Guard all of these function by {actionChannel != NULL}. Unclear 
// if this should be done in these functions or in the caller. 

function queue_attack(x, y, energy) {
    turnCommands.cmd_list.push(CMD_ATTACK  + ' ' + x + ' ' + y + ' ' + energy);
}

function queue_mine(x, y) {
    turnCommands.cmd_list.push(CMD_BUILD   + ' ' + x + ' ' + y + ' ' + BLD_GOLD_MINE);
}

function queue_well(x, y) {
    turnCommands.cmd_list.push(CMD_BUILD   + ' ' + x + ' ' + y + ' ' + BLD_ENERGY_WELL);
}

function queue_upgrade(x, y) {
    turnCommands.cmd_list.push(CMD_UPGRADE + ' ' + x + ' ' + y);
}

////////////////////////////////////////////////////////////////////////////////
