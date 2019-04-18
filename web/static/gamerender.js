////////////////////////////////////////////////////////////////////////////////
// WebSocket Variables

const gameProtocol  = window.location.protocol=='https:'&&'wss://'||'ws://';
const gameSocket    = new WebSocket( gameProtocol + window.location.host + window.location.pathname + "/game_channel" );

////////////////////////////////////////////////////////////////////////////////
// DOM Variables

const gameCol       = document.getElementById( "cf-game-col" );
const gameRow       = document.getElementById( "cf-game-row" );
const gameDiv       = document.getElementById( "game-div" );
const gameTurn      = document.getElementById( "turn-stat" );

const LOGO_HEIGHT   = 10;
const LOGO_WIDTH    = 46;

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

// Derive the maximum board size. 
const GAME_MAX_CELLS        = GAME_WIDTH * GAME_HEIGHT;
const GAME_MAX_LEVEL        = 3;

const GAME_MAX_FORCE_FIELD  = 1000; 
// Force field is min(1000, 2 * energy) if we are the only attacker. 
// Therefore, 500 energy is enough to max out the force field. 
const GAME_MAX_ATTACK       = GAME_MAX_FORCE_FIELD / 2; 

const BASE_BUILD_COST       = 100; 

////////////////////////////////////////////////////////////////////////////////
// Game Variables

let gameData    = false;
let lastTurn    = -1;
let maxTurn     = 500;

////////////////////////////////////////////////////////////////////////////////
// Rendering Variables

const cellSize      = 32;
const cellRadius    = 7;

// Draw the game as a square, so we only need one dimension. 
let gameDim         = cellSize * GAME_WIDTH;

// Use a common color for ENERGY and GOLD related drawing. 
const ENERGY_COLOR  = "#65c9cf";
const GOLD_COLOR    = "#faf334";

////////////////////////////////////////////////////////////////////////////////

// 0 is an invalid UID so it can be used as a sentinel value. 
const SENTINEL_UID  = 0; 

////////////////////////////////////////////////////////////////////////////////

// Track the state of our action_channel websocket. 
let actionChannel   = null; 

let clickUID        = SENTINEL_UID; 
let hoverUID        = SENTINEL_UID; 

let selectUID       = SENTINEL_UID; 

// Remember the username we submit. We will need this to look ourselves up 
// after we join the server since the server does not send us a confirmation. 
let selfUsername    = null; 
let selfUID         = SENTINEL_UID; 

// Selected cell position. Default to (0, 0). 
let clickCell       = [0, 0]; 
let hoverCell       = [0, 0]; 

////////////////////////////////////////////////////////////////////////////////
// PIXI Variables

const gameStage     = new PIXI.Container(parseInt("000000", 16), true);
const gameRenderer  = new PIXI.CanvasRenderer(gameDim, gameDim);
gameRenderer.interactive = true;
gameRenderer.plugins.interaction.on('mousedown', cell_click_handler);
gameRenderer.plugins.interaction.on('mousemove', cell_hover_handler); 

// Coordinates are canvas coordinates, so rescaling is automatically handled. 

function cell_hover_handler(hover) {
    hoverCell = position_to_cell(hover.data.global.x, hover.data.global.y); 
    draw_selected_cell_info(); 
}

function cell_click_handler(click) {
    clickCell = position_to_cell(click.data.global.x, click.data.global.y); 
    draw_selected_cell_info(); 
}

function position_to_cell(x, y)
{
    return [clamp(Math.floor(x / cellSize), 0, GAME_WIDTH), 
            clamp(Math.floor(y / cellSize), 0, GAME_HEIGHT)]
}

function clamp(val, lower, upper) {
    return Math.min(Math.max(val, lower), upper); 
}

////////////////////////////////////////////////////////////////////////////////

let animationStartTime  = false;

/* Appending the PIXI renderer to the DOM */
function main() {
    document.getElementById("game-div").appendChild(gameRenderer.view);
    window.requestAnimationFrame(draw_game);
}

/* Animation Loop */
function draw_game(ts) {
    if (!animationStartTime) { animationStartTime = ts; }

    let animationProgress = animationStartTime - ts;

    // Limit the dimension by width. 
    // We have a 10px padding, so the game dimension needs to minus 10*2 = 20 
    gameDim = gameCol.clientWidth - 20;

    // Limit the dimension by height. 
    gameDim = Math.min(gameDim, window.innerHeight - gameRow.offsetTop); 

    if (gameDiv.clientWidth != gameDim) {
        gameDiv.setAttribute("style", "width:" + gameDim + "px; height:" + gameDim + "px");
        // Consider the 10px padding
        gameRenderer.view.style.width  = (gameDim - 20) + "px";
        gameRenderer.view.style.height = (gameDim - 20) + "px";
    }

    if (gameData && gameData["turn"] != lastTurn ) {
        lastTurn = gameData["turn"];
        maxTurn  = gameData["info"]["max_turn"];
        gameTurn.innerHTML = lastTurn + "/" + maxTurn;

        // Clear the game board for redrawing. 
        while (gameStage.children[0]) {
            gameStage.removeChild(gameStage.children[0]);
        }

        // Draw the game board. 
        for (let y = 0; y < 30; y++) {
            for (let x = 0; x < 30; x++) {
                draw_cell(x, y, gameData["game_map"][y][x]);
            }
        }

        gameRenderer.render(gameStage);
    }
    requestAnimationFrame(draw_game);
}

/* Draw Cell */
function draw_cell(x, y, currentCell) {
    let base = new PIXI.Graphics();

    // Draw energy border. 
    base.beginFill(combine_color("#000000", "#65c9cf", currentCell["natural_energy"] / 10));
    base.drawRoundedRect(x * cellSize, y * cellSize, cellSize - 2, cellSize - 2, cellRadius);
    base.endFill();

    // Draw gold border. 
    base.beginFill(combine_color("#000000", "#faf334", currentCell["natural_gold"] / 10));
    base.drawRoundedRect(x * cellSize + 2, y * cellSize + 2, cellSize - 6, cellSize - 6, cellRadius - 2);
    base.endFill();

    // Fill in owner color. Unowned corresponds to black. 
    base.beginFill(id_to_color(currentCell["owner"]));
    base.drawRoundedRect(x * cellSize + 4, y * cellSize + 4, cellSize - 10, cellSize - 10, cellRadius - 4);
    base.endFill();

    // TODO: Highlight clicked cell. 

    gameStage.addChild( base );

    // Draw home image if it's home
    if (currentCell[ "building" ][ "name" ] == "home") {
        let home_image = PIXI.Sprite.from('/static/assets/homeI.png');
        switch(currentCell[ "building" ][ "level" ]) {
            case 1:
                home_image = PIXI.Sprite.from('/static/assets/homeI.png');
                break;
            case 2:
                home_image = PIXI.Sprite.from('/static/assets/homeII.png');
                break;
            case 3:
                home_image = PIXI.Sprite.from('/static/assets/homeIII.png');
                break;
        }
        home_image.x = x * cellSize;
        home_image.y = y * cellSize;
        gameStage.addChild(home_image);
    }

    // Draw energy well and gold mine
    if (currentCell[ "building" ][ "name" ] == "energy_well") {
        let energy_well_image = null;
        switch(currentCell[ "building" ][ "level" ]) {
            case 1:
                energy_well_image = PIXI.Sprite.from("/static/assets/energyI.png");
                break;
            case 2:
                energy_well_image = PIXI.Sprite.from("/static/assets/energyII.png");
                break;
            case 3:
                energy_well_image = PIXI.Sprite.from("/static/assets/energyIII.png");
                break;
        }
        if (energy_well_image) {
            energy_well_image.x = x * cellSize;
            energy_well_image.y = y * cellSize;
            gameStage.addChild(energy_well_image);
        }
    }

    if (currentCell[ "building" ][ "name" ] == "gold_mine") {
        let gold_mine_image = null;
        switch(currentCell[ "building" ][ "level" ]) {
            case 1:
                gold_mine_image = PIXI.Sprite.from("/static/assets/goldI.png");
                break;
            case 2:
                gold_mine_image = PIXI.Sprite.from("/static/assets/goldII.png");
                break;
            case 3:
                gold_mine_image = PIXI.Sprite.from("/static/assets/goldIII.png");
                break;
        }
        if (gold_mine_image) {
            gold_mine_image.x = x * cellSize;
            gold_mine_image.y = y * cellSize;
            gameStage.addChild(gold_mine_image);
        }
    }

}

////////////////////////////////////////////////////////////////////////////////
// Utilities

get_random_color = function() {
    var r = ("0" + Math.floor(Math.random() * 255).toString(16)).slice(-2).toUpperCase();
    var g = ("0" + Math.floor(Math.random() * 255).toString(16)).slice(-2).toUpperCase();
    var b = ("0" + Math.floor(Math.random() * 255).toString(16)).slice(-2).toUpperCase();
    return parseInt(r + g + b, 16);
}

// UID 0 corresponds to unowned. It is set to black. 
var ID_COLORS = [ 0x000000, 0xE6194B, 0x3Cb44B, 0xFFE119, 0x0082C8, 0xF58231,
                  0x911EB4, 0x46F0F0, 0xF032E6, 0xD2F53C, 0x008080, 0xAA6E28,
                  0x800000, 0xAAFFC3, 0x808000, 0x000080, 0xFABEBE, 0xE6BEFF, 
                  0xDDDDDD, ];

function id_to_color(uid) {
    while (ID_COLORS.length <= uid) {
        ID_COLORS.push(get_random_color()); 
    }
    return ID_COLORS[uid]; 
}

function hex_combine( src, dst, per ) {
    var isrc = parseInt(src, 16);
    var idst = parseInt(dst, 16);
    var curr = Math.floor(isrc + (idst - isrc) * per );
    return ("0" + curr.toString(16)).slice(-2).toUpperCase();
}

function combine_color( src, dst, per ) {
    if (per < 0) { per = 0; }
    return parseInt(hex_combine(src.slice(1, 3), dst.slice(1, 3), per) 
                  + hex_combine(src.slice(3, 5), dst.slice(3, 5), per) 
                  + hex_combine(src.slice(5)   , dst.slice(5)   , per), 16);
}

////////////////////////////////////////////////////////////////////////////////
// Start the game board animation loop. 

main();

////////////////////////////////////////////////////////////////////////////////

gameSocket.onmessage = function( msg ) {
    gameData = JSON.parse( msg.data );

    // Update the user-list sidebar. 
    draw_user_list();

    // Draw the selected info since it works for observers. 
    draw_selected_cell_info(); 
    draw_selected_user_info(); 

    // Draw our own info or the join game info.
    draw_self_user_info(); 
    // Flush our command queue. This clears our command queue even if we 
    // can not send them to avoid keeping stale commands in the queue. 
    flush_commands(); 
}

////////////////////////////////////////////////////////////////////////////////
// Web Client
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
/*
Move turn info update into the web client code. 
*/
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////

function join_game_button() {
    const joinHTML  = document.getElementById('join-game-form');
    const username  = joinHTML.elements[0].value;
    const password  = joinHTML.elements[1].value; 

    // Remember the username when we handle the join game button since this 
    // join operation should be unique per web client where as we might want 
    // to allow other ways to call into the join_game() function. 
    selfUsername    = username; 

    if (actionChannel == null) {
        // Open a socket to the action channel. 
        actionChannel = new WebSocket(gameProtocol + window.location.host + window.location.pathname + "/action_channel");
        // Register ourselves when the socket finishes initializing. 
        actionChannel.onopen = function() {
            send_join_command(username, password); 
        }
    }
    else if (actionChannel.readyState == 1) {
        // We already have an open channel. Just send the join command. 
        send_join_command(username, password); 
    }
}

function send_join_command(username, password) {
    actionChannel.send(JSON.stringify(
        {
            'action'  : 'register', 
            'username': username, 
            'password': password
        }
    )); 
}

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
function flush_commands() {
    if ((actionChannel != null) && (actionChannel.readyState == 1)) {
        // Send the command queue even if the command queue is empty because 
        // the server retries commands indefinitely, so we want to flush the 
        // queue on every turn to avoid leaving it with stale commands. 
        actionChannel.send(JSON.stringify(turnCommands));
    }
    // Clear our command queue. 
    turnCommands.cmd_list = [];
}

////////////////////////////////////////////////////////////////////////////////
// Queue a command on a given cell. 
// (0, 0) is the top-left corner. 
// X from left. 
// Y from top. 

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
        userDiv.onclick     = user_click_handler;
        userDiv.onmouseover = user_hover_handler; 
        userDiv.onmouseout  = user_out_handler; 

        userGold = create_p(user['gold']);
        // Align the gold value to the right of the entry. 
        userGold.style = 'margin-left: auto';
        userDiv.appendChild(userGold);

        // Append the row to the list. 
        listHTML.appendChild(userDiv);

        // Draw a bottom border if not the last user. 
        if (uid != users[users.length - 1][0]) {
            // Draw a bottom border. 
            userDiv.style.borderStyle = "solid";
            userDiv.style.borderColor = "#000000";
            userDiv.style.borderWidth = "0px 0px 1px 0px";
        }
    }
}

function update_selected_user() {
    // Hover has priority over click. 
    if (hoverUID == SENTINEL_UID) {
        selectUID = clickUID; 
    }
    else {
        selectUID = hoverUID;
    }
}

function user_hover_handler() {
    // Grab the data-uid field we stored on creation. 
    hoverUID = this.getAttribute('data-uid'); 
    update_selected_user(); 
    draw_selected_user_info(); 
}

function user_out_handler() {
    hoverUID = SENTINEL_UID; 
    update_selected_user(); 
    draw_selected_user_info(); 
}

function user_click_handler() {
    // Grab the data-uid field we stored on creation. 
    clickUID = this.getAttribute('data-uid');
    update_selected_user(); 
    draw_selected_user_info();
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

// Draw the USER INFO section. 
// Draw join game if we are no in the game. 
// Draw self user info if we are in the game. 
function draw_self_user_info() {
    // We can not in general tell if we are in the game because the server 
    // does not wait for clients to respond when starting a new game. 
    // Therefore we need to check if we are in the game and draw the 
    // appropriate section. 

    const joinHTML = document.getElementById('join-game-section');
    const selfHTML = document.getElementById('self-info'); 
    // Regardless of what we do, we will overwrite the self user info. 
    clear_div(selfHTML); 

    // Reset {selfUID} in case we are not in the game. 
    selfUID = SENTINEL_UID;

    // The last time we tried to join, we use {selfUsername}. 
    // Check if it is located in the {gameData} we have received. 
    // This may clash with anybody else who has the same username or if a new 
    // game started and somebody stole our username, but these cases should be 
    // rare in the expected environment, so we just assume they do not happen. 
    for (const [uid, user] of Object.entries(gameData['users'])) {
        if (user['username'] == selfUsername) {
            selfUID = uid; 
            break; 
        }
    }

    if (selfUID == SENTINEL_UID) {
        // We are not in the game. Show the join game form. 
        joinHTML.style.display = '';
    }
    else {
        // Hide the join game form. 
        joinHTML.style.display = 'none';
        // Insert the desired user info. 
        selfHTML.appendChild(create_user_info(selfUID, get_user_info(selfUID))); 
    }
}

// Draw the SELECTED USER INFO section. 
function draw_selected_user_info() {
    const userHTML = document.getElementById('selected-user-info');
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

function draw_selected_cell_info()
{
    const cellHTML = document.getElementById('selected-cell-info');
    clear_div(cellHTML);

    if (gameData) {
        // Do not draw until we have game information. 
        if (gameRenderer.plugins.interaction.mouseOverRenderer) {
            cellHTML.appendChild(create_cell_info(hoverCell[0], hoverCell[1]));
        }
        else {
            cellHTML.appendChild(create_cell_info(clickCell[0], clickCell[1])); 
        }
    }
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

    const cellMap   = gameData['game_map'];
    const cell      = cellMap[y][x];
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

    let costString = 'Cost: ';
    let attackCost = cell['natural_cost'];
    if (building['name'] == 'home') {
        // Home has a base attack cost of 1000. 
        attackCost = 1000; 
    }
    costString += String(attackCost); 

    const forceField = cell['force_field'];
    if (forceField > 0) {
        // Put the force field in parens. 
        costString += ' (';
        costString += String(forceField); 

        // Iterate through adjacent looking for sieging. 
        let siegeCount  = 0;
        let adjPos      = get_adjacent_cells(x, y);
        for (let pos of adjPos) {
            let adjOwner = cellMap[pos[1]][pos[0]]['owner'];
            if ((adjOwner != 0) && (cell['owner'] != adjOwner)) {
                siegeCount += 1; 
            }
        }

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

    let buttonDiv = document.createElement('div'); 

    if (selfUID != SENTINEL_UID) {
        // We are in the game. Draw possible action buttons. 
        let selfData = gameData['users'][selfUID];

        if (ownerUID == selfUID) {
            // We are the owner. We can either build or upgrade. 
            if (building['name'] == 'empty') {
                // There is no building. Draw building choices. 
                buttonDiv.appendChild(create_cost_button('Create Well', 
                    BASE_BUILD_COST, function(){queue_well(x, y);})); 
                buttonDiv.appendChild(create_cost_button('Create Mine', 
                    BASE_BUILD_COST, function(){queue_mine(x, y);})); 
            }
            else {
                // There is a building. Draw upgrade choice. 
                let upgradeLevel = building['level'];
                if (upgradeLevel < GAME_MAX_LEVEL) {
                    // Can upgrade further. 
                    let canUpgrade  = true; 
                    let upgradeCost = 0; 
                    if (building['name'] == 'home') {
                        // Home has a base cost of 1000. 
                        // Cost doubles per level. 
                        upgradeCost = 1000 * Math.pow(2, upgradeLevel - 1); 
                    }
                    else {
                        // We are not upgrading a home. 
                        if (upgradeLevel >= selfData['tech_level']) {
                            // Home not high enough level. 
                            canUpgrade = false; 
                        }
                        // Cost doubles per level. 
                        upgradeCost = BASE_BUILD_COST * Math.pow(2, upgradeLevel);
                    }

                    if (canUpgrade) {
                        // Enough resources. 
                        buttonDiv.appendChild(create_cost_button('Upgrade', 
                            upgradeCost, function(){queue_upgrade(x, y);})); 
                    }
                }
            }
        }
        else {
            // // We are not the owner. Check if we can attack. 
            let canAttack   = false;
            let adjPos      = get_adjacent_cells(x, y);
            for (let pos of adjPos) {
                if (cellMap[pos[1]][pos[0]]['owner'] == selfUID) {
                    // We own an adjacent cell. 
                    canAttack = true;
                    break;
                }
            }

            if (canAttack) {
                // We have at least one adjacent cell. We can attack. 
                // Calculate a few common attack patterns. 
                let selfEnergy  = selfData['energy'];

                // Min attack. Just enough to capture. 
                let minAttack   = attackCost + forceField;
                // Max attack. Enough to max out the force field. 
                let maxAttack   = Math.max(minAttack, GAME_MAX_ATTACK); 

                // Create a min attack button. 
                buttonDiv.appendChild(create_button('Min Attack: ' + minAttack, 
                    function(){queue_attack(x, y, minAttack)}));

                // Create a max attack button. 
                buttonDiv.appendChild(create_button('Max Attack: ' + maxAttack, 
                    function(){queue_attack(x, y, maxAttack)})); 

                // TODO: Draw in a form attack. 
            }
        }
    }

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
    cellDiv.appendChild(buttonDiv); 

    ////////////////////////////////////////////////////////////////////////////

    return cellDiv; 
}

function get_adjacent_cells(x, y) {
    let adjCells    = []; 
    // Get the raw list of adjacent positions. 
    let adjPos      = [ [x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1] ]; 
    for (let pos of adjPos) {
        if (   ((0 <= pos[0]) && (pos[0] < GAME_WIDTH)) 
            && ((0 <= pos[1]) && (pos[1] < GAME_HEIGHT))) {
            // Only add in-bounds positions. 
            adjCells.push(pos); 
        }
    }
    return adjCells; 
}

function create_cost_button(name, cost, click_handler) {
    return create_button(name + ': ' + '(' + cost + ', ' + cost + ')', click_handler); 
}

function create_button(text, click_handler)
{
    let button = document.createElement('BUTTON');
    button.innerHTML    = text; 
    button.onclick      = click_handler; 
    return button; 
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
    colorString = id_to_color(uid).toString(16); 
    // HTML expects a '#' + hex. 
    // Pad string to 6 hex values since javascript will remove leading zeroes. 
    return '#' + '0'.repeat(6 - colorString.length) + colorString; 
}

// Capitalize the first character in a string. 
function capitalize_first(string) {
    return string.charAt(0).toUpperCase() + string.slice(1); 
}

////////////////////////////////////////////////////////////////////////////////
