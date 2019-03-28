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

////////////////////////////////////////////////////////////////////////////////

gameSocket.onmessage = function( msg ) {
    gameData = JSON.parse( msg.data );

    // Update the user-list sidebar. 
    draw_user_list();

    // Draw the selected info since it works for observers. 
    draw_selected_cell_info(); 
    draw_selected_user_info(); 

    if (actionChannel != null) {
        // We have joined the game. Draw our own info. 
        draw_self_user_info(); 
    }
}

////////////////////////////////////////////////////////////////////////////////
// Web Client
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/*
TODO: 
Deal with game resets. We need to be able to join after a reset and we need 
to clear our game state. We probably need to watch the user list to observe 
if we are still on it. We can watch for UID+username combo or possibly turn 
count. Do we need to reset the action_channel? If not we need to change how 
we join games since the socket may already be open. 

Add cell selection. 

User selection is laggy. 
*/
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

// 0 is an invalid UID so it can be used as a sentinel value. 
const SENTINEL_UID          = 0; 

////////////////////////////////////////////////////////////////////////////////

// Track the state of our action_channel websocket. 
let actionChannel   = null; 

let selectUID       = SENTINEL_UID; 

// Remember the username we submit. We will need this to look ourselves up 
// after we join the server since the server does not send us a confirmation. 
let selfUsername    = null; 
let selfUID         = SENTINEL_UID; 

// Selected cell position. Default to (0, 0). 
let selectCell      = [0, 0]; 

////////////////////////////////////////////////////////////////////////////////

function join_game_button() {
    const joinHTML  = document.getElementById('join-game-form');
    const username  = joinHTML.elements[0].value;
    const password  = joinHTML.elements[1].value; 

    // Remember the username when we handle the join game button since this 
    // join operation should be unique per web client where as we might want 
    // to allow other ways to call into the join_game() function. 
    selfUsername    = username; 

    join_game(username, password); 
}

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
// Web Info
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////

// Draw user list on left. 
// Draw self user on right under turn. (Join Game Button). 
// Draw specific user on right under self user. 
// Draw specific cell on right under specific user. 

function draw_user_list() {
    const listHTML  = document.getElementById('user-list-info');
    const users     = Object.entries(gameData['users']);

    // Clear out all the old user rows. 
    clear_div(listHTML); 

    // Create a row per user. 
    for (const [uid, user] of users) {
        // [color box] username (dead/in-game)

        // Create a user info row. 
        userDiv = create_user_box(uid, user['username']);
        // Select the user on click. 
        userDiv.onclick = select_user;

        // Append the row to the list. 
        listHTML.appendChild(userDiv);

        // Draw a line break if not the last user. 
        if (uid != users[users.length - 1][0]) {
            // Draw a line-break. 
            const lineBreak = document.createElement('hr');
            lineBreak.className = 'user-list-line';
            listHTML.appendChild(lineBreak);
        }
    }
}

function select_user() {
    // Grab the data-uid field we stored on creation. 
    selectUID = this.getAttribute('data-uid');
}

function create_user_box(uid, username) {
    // Create a horizontal flex box for the row. 
    const userBoxDiv        = document.createElement('div');
    userBoxDiv.className    = 'd-flex';
    // Store the UID in the div. 
    userBoxDiv.setAttribute('data-uid', uid); 

    // Create a box for the user color. 
    const userColorBox      = document.createElement('div');
    userColorBox.className  = 'user-color-box';
    userColorBox.style.backgroundColor  = HTML_id_to_color(uid);

    // Construct the row. 
    userBoxDiv.appendChild(userColorBox);
    userBoxDiv.appendChild(create_p(username));

    return userBoxDiv;
}

////////////////////////////////////////////////////////////////////////////////

// Default user when no UID is specified, but we want to fill in the infos. 
const defaultUser = { 
    'uid'           : 0, 
    'username'      : 'None', 
    'energy'        : 0, 
    'gold'          : 0, 
    'dead'          : false, 
    'tech_level'    : 0, 
    'energy_source' : 0, 
    'gold_source'   : 0, 
    'cells'         : [], 
};

// Draw the USER INFO section after joining the game. 
function draw_self_user_info() {
    const selfHTML = document.getElementById('self-info'); 
    clear_div(selfHTML); 

    if (selfUID == SENTINEL_UID) {
        // We have not yet found ourselves in the game. 
        // Scan the current game data to see if we have been added yet. 
        const users = Object.entries(gameData['users']);
        for (const [uid, user] of users) {
            if (user['username'] == selfUsername) {
                // We found ourselves. 
                selfUID = uid; 
                break;
            }
        }
    }

    selfHTML.appendChild(create_user_info(selfUID, get_user_info(selfUID))); 
}

// Draw the SELECTED USER INFO section. 
function draw_selected_user_info() {
    const userHTML = document.getElementById('user-info');
    clear_div(userHTML); 
    userHTML.appendChild(create_user_info(selectUID, get_user_info(selectUID))); 
}

// Get the user info for the specified UID. 
function get_user_info(uid) {
    if (uid == SENTINEL_UID) {
        return defaultUser;
    }
    else {
        return gameData['users'][uid]; 
    }
}

// Create a user info div. 
function create_user_info(uid, user) {
    // [color box] username (dead/in-game)
    // tech_level
    // cells owned / total cells
    // energy + energy_source
    //   gold + gold_source

    const userDiv       = document.createElement('div');
    userDiv.className   = 'game-status-section';

    ////////////////////////////////////////////////////////////////////////////
    // Construct the resource table as vertically-aligned columns. 

    // Create 4 vertical columns. 
    // Create 2 rows per column, one per resource. 
    // | Total | + | Rate | Type |

    // Construct the internal node strings. 
    const energyTotal   = create_p(user['energy']);
    const goldTotal     = create_p(user['gold']);
    // Right align toward the '+'. 
    energyTotal.className   = 'text-right';
    goldTotal.className     = 'text-right';

    // Create a set of nodes by [column][row]. 
    const userResourceTable = [
        [energyTotal                    , goldTotal                     ], 
        [create_p('+')                  , create_p('+')                 ], 
        [create_p(user['energy_source']), create_p(user['gold_source']) ], 
        [create_p('Energy')             , create_p('Gold')              ], 
    ]; 

    ///////////////////////////////////////////////////////
    // Construct the whole user info div. 

    // Construct the user box. 
    userDiv.appendChild(create_user_box(uid, user['username']));
    // Construct the tech level info. 
    userDiv.appendChild(create_p('Tech Level: ' + user['tech_level']));
    // Construct the cell count info. 
    userDiv.appendChild(create_p(user['cells'].length + '/' + GAME_MAX_CELLS));
    // Construct the resource table as specified above. 
    userDiv.appendChild(create_flex_table(userResourceTable));

    ////////////////////////////////////////////////////////////////////////////

    return userDiv;
}

////////////////////////////////////////////////////////////////////////////////

function draw_selected_cell_info(x, y)
{
    const cellHTML = document.getElementById('cell-info');
    clear_div(cellHTML);
    cellHTML.appendChild(create_cell_info(selectCell[0], selectCell[1]));
}

// Create a cell info div. 
function create_cell_info(x, y) {
    // [color box] owner
    // x, y
    // Level Building
    // energy   (base)
    // gold     (base)
    // attack_cost + (force_field - % siege loss)
    // 
    // if attackable: min attack, max attack, other attack
    // if buildable : mine or well (cost, old -> new)
    // if upgrade   : upgrade      (cost, old -> new)

    const cellDiv       = document.createElement('div');
    cellDiv.className   = 'game-status-section';

    ////////////////////////////////////////////////////////////////////////////

    const cell      = gameData['game_map'][y][x];
    const ownerUID  = cell['owner'];

    let ownerName   = 'None';
    if (ownerUID != 0) {
        ownerName = gameData['users'][ownerUID]['username']; 
    }

    ////////////////////////////////////////////////////////////////////////////
    // Construct the resource table as vertically-aligned columns. 

    // Create 3 vertical columns. 
    // Create 2 rows per column, one per resource. 
    // | Rate | Base | Type |

    // Construct the internal node strings. 
    const energyRate        = create_p(cell['energy']);
    const goldRate          = create_p(cell['gold']);
    // Right align toward the base. 
    energyRate.className    = 'text-right';
    goldRate.className      = 'text-right';

    // Put the base resource rates in parentheses. 
    const energyBase        = create_p('(' + cell['natural_energy'] + ')'); 
    const goldBase          = create_p('(' + cell['natural_gold'] + ')'); 
    // Right align toward type. 
    energyBase.className    = 'text-right';
    goldBase.className      = 'text-right';

    const cellResourceTable = [
        [energyRate         , goldRate          ], 
        [energyBase         , goldBase          ], 
        [create_p('Energy') , create_p('Gold')  ], 
    ]; 

    ////////////////////////////////////////////////////////////////////////////
    // Construct building string. 

    const building        = cell['building'];
    const buildingString  = 'LV. ' + building['level'] + ' ' + capitalize_first(building['name']); 

    ////////////////////////////////////////////////////////////////////////////
    // Construct the attack cost string. 

    let costString = 'Cost: ' + String(cell['natural_cost']); 

    const forceField = cell['force_field'];
    if (forceField > 0) {
        // Put the force field in parens. 
        costString += ' (';
        costString += String(forceField); 

        // Iterate through adjacent looking for sieging. 
        let siegeCount      = 0;
        // let adjacentCells   = GetAdjacentCells(x, y);
        // for (adjacent in adjacentCells) {
        //     if (cell['owner'] != adjacent['owner']) {
        //         siegeCount += 1; 
        //     }
        // }
        if (siegeCount > 0) {
            // Subtract the siege percent.
            costString += ' - ';
            costString += String(siegeCount * GAME_SIEGE_PERCENT);
            costString += '%';
        }

        // Close out the parens. 
        costString += ')';
    }

    ////////////////////////////////////////////////////////////////////////////

    // if () {
    //     // We are in the game. Draw possible action buttons. 
    //     if (ownerUID == selfUID) {
    //         // We are the owner. We can either build or upgrade. 
    //         if (cell['building'] == 'empty') {
    //             // There is no building. Draw building choices. 
    //         }
    //         else {
    //             // There is a building. Draw upgrade choices. 
    //             // TODO: Handle max level and home not high enough. 
    //         }
    //     }
    //     else {
    //         // We are not the owner. Check if we can attack. 
    //         if () {
    //             // We have at least one adjacent cell. We can attack. 
    //             // TODO: Draw a few common attack patterns. 
    //             // MIN, MAX, Fill In
    //         }
    //     }
    // }

    ////////////////////////////////////////////////////////////////////////////

    // Construct the owner box. 
    cellDiv.appendChild(create_user_box(ownerUID, ownerName)); 
    // Construct the position info. 
    cellDiv.appendChild(create_p('(' + x + ', ' + y + ')')); 
    // Construct the building info. 
    cellDiv.appendChild(create_p(buildingString)); 
    // Construct the resource table as specified above. 
    cellDiv.appendChild(create_flex_table(cellResourceTable)); 
    // Construct the cost info. 
    cellDiv.appendChild(create_p(costString)); 

    ////////////////////////////////////////////////////////////////////////////

    return cellDiv; 
}

////////////////////////////////////////////////////////////////////////////////

// Create a 2D vertical-aligned flex table from a 2D table of nodes. 
function create_flex_table(tableNodes)
{
    // Create a d-flex table. 
    const tableDiv      = document.createElement('div');
    tableDiv.className  = 'd-flex';

    // Construct the table out of the nodes specified above. 
    for (let i = 0; i < tableNodes.length; i++) {
        let colDiv      = document.createElement('div');
        let colNodes    = tableNodes[i]; 
        // Construct one row per resource type. 
        for (let j = 0; j < colNodes.length; j++) {
            colDiv.appendChild(colNodes[j]);
        }
        // Add the column. 
        tableDiv.appendChild(colDiv);
    }

    return tableDiv; 
}

// Create a basic <p> node with a text body. 
function create_p(text) {
    const node = document.createElement('p');
    node.appendChild(document.createTextNode(text));
    return node; 
}

// Clear an entire div. 
function clear_div(divHTML) {
    while (divHTML.firstChild) {
        divHTML.firstChild.remove();
    }
}

// Convert a 6-hex value to a corresponding HTML RGB color code string. 
function HTML_id_to_color(uid) {
    // TODO: ID_COLORS[0] should be #000000 to simplify some edge cases. 
    if (uid == 0) {
        return '#000000'; 
    }
    else {
        // HTML expects a '#' + hex. 
        return '#' + id_to_color(uid).toString(16); 
    }
}

// Capitalize the first character in a string. 
function capitalize_first(string) {
    return string.charAt(0).toUpperCase() + string.slice(1); 
}

////////////////////////////////////////////////////////////////////////////////
