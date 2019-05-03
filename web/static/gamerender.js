// Master switch for replay mode, now is kind of stupid
var gameRoomMode = 'play';
if (window.location.pathname.indexOf('replay') > 0) {
    gameRoomMode = 'replay';
}

////////////////////////////////////////////////////////////////////////////////
// WebSocket Variables
const gameProtocol = window.location.protocol=='https:'&&'wss://'||'ws://';
var gameSocket;

if (gameRoomMode == 'play') {
    gameSocket   = new WebSocket( gameProtocol + window.location.host + window.location.pathname.substr(0, window.location.pathname.lastIndexOf('/')) + "/game_channel" );
}

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
const BLD_FORTRESS      = 'f';

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

let gameData     = false;
let prevGameData = false;
let lastTurn     = -1;
let maxTurn      = 500;
let countDown    = 0;

////////////////////////////////////////////////////////////////////////////////
// Rendering Variables

const cellSize      = 32;
const cellRadius    = 8;

// Draw the game as a square, so we only need one dimension. 
let gameDim         = cellSize * GAME_WIDTH;

// Use a common color for ENERGY and GOLD related drawing. 
const ENERGY_COLOR  = "#65c9cf";
const GOLD_COLOR    = "#faf334";

const GREY_BACKGROUND   = '#222222';
const HIGHLIGHT_COLOR   = '#ffffff';

let forceRefresh  = false;
let renderOptions = {
    "energy"  : true,
    "gold"    : true,
    "owner"   : true,
    "building": true,
};

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
let highlightCell   = false;
let clickCell       = [0, 0];
let hoverCell       = [0, 0]; 

////////////////////////////////////////////////////////////////////////////////
// PIXI Variables

const gameStage     = new PIXI.Container(parseInt("000000", 16), true);
const gameRenderer  = new PIXI.CanvasRenderer(gameDim, gameDim);
gameRenderer.interactive = true;
gameRenderer.plugins.interaction.on('mousedown', cell_click_handler);
gameRenderer.plugins.interaction.on('mousemove', cell_hover_handler); 

// An array to store the cell containers
let cellContainers = new Array(GAME_HEIGHT);
let gameMapEmpty   = true;
for (var i = 0; i < cellContainers.length; i++) {
    cellContainers[i] = new Array(GAME_WIDTH);
    for (var j = 0; j < cellContainers[i].length; j++) {
        let cell = new PIXI.Container(); 
        // Background. 
        cell.addChild(new PIXI.Graphics());
        // Base color. 
        cell.addChild(new PIXI.Graphics());
        // Base animations. 
        cell.addChild(new PIXI.Graphics());
        // Container for drawing buildings and their animations. 
        cell.addChild(new PIXI.Container());

        cellContainers[i][j] = cell; 
        gameStage.addChild(cellContainers[i][j]);
    }
}

// Coordinates are canvas coordinates, so rescaling is automatically handled. 

function cell_hover_handler(hover) {
    hoverCell = position_to_cell(hover.data.global.x, hover.data.global.y); 
    update_selected_user();
    draw_selected_cell_info(); 
    draw_selected_user_info(); 
}

function cell_click_handler(click) {
    if (highlightCell != false) {
        set_cell_bg(clickCell[0], clickCell[1], GREY_BACKGROUND);
    }
    clickCell       = position_to_cell(click.data.global.x, click.data.global.y); 
    highlightCell   = true;
    set_cell_bg(clickCell[0], clickCell[1], HIGHLIGHT_COLOR);
    draw_selected_cell_info(); 
}

function cell_click_clear_handler(click) {
    highlightCell = false;
    set_cell_bg(clickCell[0], clickCell[1], GREY_BACKGROUND);
}

function position_to_cell(x, y)
{
    return [clamp(Math.floor(x / cellSize), 0, GAME_WIDTH - 1), 
            clamp(Math.floor(y / cellSize), 0, GAME_HEIGHT - 1)]
}

function clamp(val, lower, upper) {
    return Math.min(Math.max(val, lower), upper); 
}

////////////////////////////////////////////////////////////////////////////////

// Load assets here
const assets = [
    "/static/assets/energy_well1.json",
    "/static/assets/energy_well2.json",
    "/static/assets/energy_well3.json",
    "/static/assets/gold_mine1.json",
    "/static/assets/gold_mine2.json",
    "/static/assets/gold_mine3.json",
    "/static/assets/home1.json",
    "/static/assets/home2.json",
    "/static/assets/home3.json",
    "/static/assets/fortress1.json",
    "/static/assets/fortress2.json",
    "/static/assets/fortress3.json",
    "/static/assets/buildEffect.json",
    "/static/assets/upgradeEffect.json",
    "/static/assets/destroyEffect.json"
]

PIXI.loader
    .add(assets)
    .load(setup)

var energySheet = false;
var buildEffectSheet = false;
var animations = {};

function setup() {
    for (let i in assets) {
        let asset = assets[i];
        // This is evil
        let asset_name = asset.split('/').pop().split('.')[0];
        animations[asset_name] = PIXI.loader.resources[asset].spritesheet.animations[asset_name];
    }
    main();
}

let turnStartTime = false;

/* Appending the PIXI renderer to the DOM */
function main() {
    document.getElementById("game-div").appendChild(gameRenderer.view);
    window.requestAnimationFrame(draw_game);
}

/* Animation Loop */
function draw_game(ts) {
    // For any reasonable screens, we should expect the height be the limit
    // Limit the dimension by height and screen width. 
    gameDim = Math.min(window.innerWidth * 0.6, window.innerHeight - gameRow.offsetTop); 

    if (gameDiv.clientWidth != gameDim) {
        gameDiv.setAttribute("style", "width:" + gameDim + "px; height:" + gameDim + "px");
        // Consider the 10px padding
        gameRenderer.view.style.width  = (gameDim - 20) + "px";
        gameRenderer.view.style.height = (gameDim - 20) + "px";
    }

    // We only draw the whole game for a new turn.
    // Currently all the animations are sprites so we do not need to write our
    // own animation functions. However, if we need to change some objects very
    // frequently for animation, we need to take care of the sprites. We can not
    // simply clear and redraw for everything because animated sprites will not 
    // work with it.
    //
    // TODO: we probably have a race condition here for checking diff
    if (gameData) {
        let gameMap = gameData['game_map'];
        let prevMap = prevGameData['game_map'];

        // NOTE: has_changed() checks are needed to make the info panes respond 
        // reasonably. However, it does not appear to have a major impact on 
        // the compute costs, so it seems like this might be an artifact of 
        // some other unknown resource consumption. We should investigate if 
        // this is due to the DOM manipulations in the info pane or if it is 
        // us not receiving events. 

        if (gameData["turn"] != lastTurn || countDown != gameData["info"]["start_count_down"] || forceRefresh) {
            turnStartTime = ts;
            lastTurn  = gameData["turn"];
            maxTurn   = gameData["info"]["max_turn"];
            countDown = gameData["info"]["start_count_down"];
            
            gameTurn.innerHTML = lastTurn + "/" + maxTurn;
            if (countDown != 0) {
                gameTurn.innerHTML += " (" + countDown.toString() + ")";
            }

            // Draw the game board once per turn. 
            for (let y = 0; y < GAME_HEIGHT; y++) {
                for (let x = 0; x < GAME_WIDTH; x++) {
                    if (gameMapEmpty || has_changed(gameMap[y][x], prevMap[y][x]) || forceRefresh) {
                        per_turn_draw_cell(x, y, gameMap[y][x], prevMap[y][x]); 
                    }
                }
            }
            gameMapEmpty = false;
        }

        // Get progress % in the current turn. 
        // {ts} is in units of ms. A turn is 1 second. 
        let turnProgress = clamp(ts - turnStartTime, 0, 1000) / 1000; 

        // Animate the cells per frame. 
        for (let y = 0; y < GAME_HEIGHT; y++) {
            for (let x = 0; x < GAME_WIDTH; x++) {
                if (owner_changed(gameMap[y][x], prevMap[y][x]) || forceRefresh) {
                    animate_cell(x, y, gameMap[y][x], prevMap[y][x], turnProgress);
                }
            }
        }

        forceRefresh = false;
    }

    // Always render the game for the animation
    gameRenderer.render(gameStage);
    
    requestAnimationFrame(draw_game);
}

function has_changed(currCell, prevCell) {
    return (currCell["building"]["name"]  != prevCell["building"]["name"]) 
        || (currCell["building"]["level"] != prevCell["building"]["level"]) 
        || owner_changed(currCell, prevCell); 
}

function owner_changed(currCell, prevCell) {
    return (currCell["owner"] != prevCell["owner"]);
}

function change_render_options(options) {
    for (key in options) {
        if (key in renderOptions) {
            if (options[key] == "toggle") {
                renderOptions[key] = !renderOptions[key];
            } else {
                renderOptions[key] = options[key];
            }
        }
    }
    full_refresh();
}

function full_refresh()
{
    forceRefresh = true;
}

function per_turn_draw_cell(x, y, currCell, prevCell)
{
    let borderCount = 0;
    let base    = cellContainers[y][x].children[1];
    let animate = cellContainers[y][x].children[2];
    let build   = cellContainers[y][x].children[3];

    base.clear();
    animate.clear();

    // Clear the building animations. 
    build.removeChildren();

    // Draw a the background. This will show up even when all the render 
    // options are off. By default do a grey grid, but draw it white if 
    // the cell is clicked as a basic highlight. 
    if ((highlightCell != false) && (x == clickCell[0]) && (y == clickCell[1])) {
        set_cell_bg(x, y, HIGHLIGHT_COLOR);
    }
    else {
        set_cell_bg(x, y, GREY_BACKGROUND);
    }
    borderCount += 1; 

    // Draw energy border. 
    if (renderOptions["energy"] || currCell['owner'] == 0) {
        draw_cell_rect(base, '#65c9cf', currCell['natural_energy'] / 10, x, y, borderCount * 2);
        borderCount += 1;
    }
    // Draw gold border. 
    if (renderOptions["gold"] || currCell['owner'] == 0) {
        draw_cell_rect(base, '#faf334', currCell['natural_gold']   / 10, x, y, borderCount * 2);
        borderCount += 1;
    }
    // Fill in owner color. Unowned corresponds to black. 
    if (renderOptions["owner"]) {
        draw_cell_rect(base, id_to_color(currCell['owner']), 1.0, x, y, borderCount * 2);
    } else {
        draw_cell_rect(base, id_to_color(0), 1.0, x, y, borderCount * 2);
    }

    if (renderOptions['building']) {
        // Draw building. 
        let currBuilding = currCell['building']; 
        let prevBuilding = prevCell['building']; 

        // Setup any needed animated sprites. 
        if (currBuilding["name"] != "empty") {
            draw_building(x, y, currBuilding);
            if (currBuilding['name'] != prevBuilding['name']) {
                // Different building. 
                draw_building_effect(x, y); 
            }
            else if (currBuilding['level'] != prevBuilding['level']) {
                // Building is a higher level. 
                draw_upgrade_effect(x, y); 
            }
        }

        if (currBuilding["name"] == "empty" && prevBuilding["name"] != "empty") {
            draw_destroy_effect(x, y);
        }
    }
}

function set_cell_bg(x, y, color) {
    cellBG = cellContainers[y][x].children[0];
    cellBG.clear();
    draw_cell_rect(cellBG, color, 1.0, x, y, 0); 
}

function animate_cell(x, y, currCell, prevCell, progress) {
    if (renderOptions["owner"]) {
        let capture_cell    = cellContainers[y][x].children[2]; 
        let ownerShrink     = 0; 
        let prevMap         = prevGameData['game_map'];
        // Cell was captured the previous round. 

        let borderCount = 1;
        if (renderOptions['energy'] || currCell['owner'] == 0) {
            borderCount += 1;
        } 
        if (renderOptions['gold'] || currCell['owner'] == 0) {
            borderCount += 1;
        }
        ownerShrink = borderCount * 2

        // Draw a shrinking rectangle of the old color.

        // Shrinking direction depends on adjacency. 
        // Start with all directions being 0. 
        // We deliberately use integers intead of booleans since we will 
        // abuse this fact when we calculate how to draw the animation. 
        let shrinkDir   = Array(4).fill(0);
        let adjPos      = get_adjacent_cells(x, y);
        for (let pos of adjPos) {
            if (prevMap[pos[1]][pos[0]]['owner'] == currCell['owner']) {
                // The new owner of {currCell} owned this adjacent cell 
                // during the previous frame. Identify adjacency. 
                // Up, Down
                if (pos[0] == x) { if (pos[1] > y) { shrinkDir[0] = 1; }
                                   else            { shrinkDir[1] = 1; }
                }
                // Right, Left
                else {             if (pos[0] > x) { shrinkDir[2] = 1; }
                                   else            { shrinkDir[3] = 1; }
                }
            }
        }
        // We now know how to draw the capture. 
        let drawSize = (cellSize - ownerShrink * 2); 

        // TODO: There is probably a better way to do this calculation. 

        // Compute the horizontal changes. 
        let xScale  = shrinkDir[2] + shrinkDir[3];
        let xLeft   = 0;
        let xRight  = 0;
        if (xScale != 0) {
            xLeft   = progress * (shrinkDir[3] / xScale);
            xRight  = progress * (shrinkDir[2] / xScale); 
        }

        // Compute the vertical changes. 
        let yScale  = shrinkDir[0] + shrinkDir[1]; 
        let yTop    = 0; 
        let yBot    = 0; 
        if (yScale != 0) {
            yTop = progress * (shrinkDir[1] / yScale);
            yBot = progress * (shrinkDir[0] / yScale); 
        }

        // No adjacent blocks is possible if we are just joining the game or 
        // the game refreshed. In both cases, do no animation. 
        if ((xScale != 0) || (yScale != 0)) {
            capture_cell.clear();
            capture_cell.beginFill(combine_color(id_to_color(prevCell['owner']), id_to_color(currCell['owner']), progress)); 
            capture_cell.drawRect((cellSize * x) + ownerShrink + (drawSize * xLeft), 
                          (cellSize * y) + ownerShrink + (drawSize * yTop), 
                          drawSize * (1 - (xLeft + xRight)), 
                          drawSize * (1 - (yTop + yBot))); 
            capture_cell.endFill(); 
        }
    }
}

function draw_building(x, y, building) {
    draw_cell_building(x, y, building['name'] + building['level'].toString(), true);
}

function draw_building_effect(x, y) {
    draw_cell_building(x, y, 'buildEffect', false);
}

function draw_upgrade_effect(x, y) {
    draw_cell_building(x, y, 'upgradeEffect', false); 
}

function draw_destroy_effect(x, y) {
    draw_cell_building(x, y, 'destroyEffect', false);
}

function draw_cell_building(x, y, animation_name, loop) {
    if (animations[animation_name]) {
        let build_effect_image = new PIXI.extras.AnimatedSprite(animations[animation_name]);
        build_effect_image.x = x * cellSize;
        build_effect_image.y = y * cellSize;
        build_effect_image.animationSpeed = animations[animation_name].length / 60;
        build_effect_image.loop = loop;
        build_effect_image.play(); 
        // We inserted a building placeholder at index 3. 
        cellContainers[y][x].children[3].addChild(build_effect_image);
    }
}

function draw_cell_rect(base, color, color_strength, x, y, shrink) {
    base.beginFill(combine_color("#000000", color, color_strength));
    base.drawRect(x * cellSize + shrink, y * cellSize + shrink, 
        cellSize - (shrink * 2), cellSize - (shrink * 2));
    base.endFill();
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
// This is 20 colors inherited from colorfight, for colorfightII, we only need 
// 8 colors + black. We added a couple more for extras
// var ID_COLORS = [ 0x000000, 0xE6194B, 0x3Cb44B, 0xFFE119, 0x0082C8, 0xF58231,
//                   0x911EB4, 0x46F0F0, 0xF032E6, 0xD2F53C, 0x008080, 0xAA6E28,
//                   0x800000, 0xAAFFC3, 0x808000, 0x000080, 0xFABEBE, 0xE6BEFF, 
//                   0xDDDDDD, ];
var ID_COLORS = [0x000000, 0xE6194B, 0x3CB44B, 0xffe119, 0x4363D8, 0xF58231,
                 0x42D4F4, 0xF032E6, 0x9A6324,
                 0x800000, 0x469990, 0xFABEBE, 0x000075, 0xE6BEFF, 0x911EB4];

// Convert a 6-hex value to a corresponding HTML RGB color code string. 
function id_to_color(uid) {
    while (ID_COLORS.length <= uid) {
        ID_COLORS.push(get_random_color()); 
    }
    colorString = ID_COLORS[uid].toString(16); 

    // HTML expects a '#' + hex. 
    // Pad string to 6 hex values since javascript will remove leading zeroes. 
    return '#' + '0'.repeat(6 - colorString.length) + colorString; 
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
// Get data and start draw loop

// Play, get data from websockets
if (gameRoomMode == 'play') {
    gameSocket.onmessage = function( msg ) {
        let tempGameData = JSON.parse(msg.data);
        parse_game_data_and_draw(tempGameData);
    }
}

// Parse gameData and draw the game, replay will use this function to draw
function parse_game_data_and_draw(newData) {
    newData = unpack_game_data(newData);
    if (gameData && gameData['turn'] != newData['turn']) {
        prevGameData = gameData
    }
    
    if (!gameData || 
            newData['turn'] < gameData['turn'] || 
            newData['info']['game_id'] != gameData['info']['game_id']) {
        full_refresh();
    }
    // only update game_map if it's a new turn
    if (gameData && 
            gameData['info']['game_id'] == newData['info']['game_id'] && 
            newData['turn'] == gameData['turn']) {
        newData['game_map'] = gameData['game_map'];
    }
    gameData = newData;

    if (!prevGameData) {
        prevGameData = gameData;
    }

    // Update the user-list sidebar. 
    draw_user_list();

    // Draw the selected info since it works for observers. 
    draw_selected_cell_info(); 
    draw_selected_user_info(); 

    // Draw our own info or the join game info.
    if (document.getElementById('user-info')) {
        draw_self_user_info(); 
    }
    // Flush our command queue. This clears our command queue even if we 
    // can not send them to avoid keeping stale commands in the queue. 
    flush_commands(); 
}

function unpack_game_data(game_data) {
    let game_map = [];
    let headers = game_data['game_map']['headers'];
    for (let y = 0; y < game_data['game_map']['data'].length; y++) {
        game_map.push([])
        for (let x = 0; x < game_data['game_map']['data'][y].length; x++) {
            game_map[y].push([]);
            let data = game_data['game_map']['data'][y][x];
            for (let hidx = 0; hidx < headers.length; hidx++) {
                let header = headers[hidx];
                if (header == 'building') {
                    let building = {};
                    try {
                        building['name'] = letter_to_name(data[hidx][0]);
                    } catch(exception) {
                        console.log(exception)
                        console.log(y)
                        console.log(x)   
                        console.log(data)
                    }
                    building['level'] = data[hidx][1];
                    game_map[y][x]['building'] = building;
                } else {
                    game_map[y][x][header] = data[hidx];
                }
            }
        }
    }
    game_data['game_map'] = game_map;
    return game_data;
}

function letter_to_name(letter) {
    switch(letter) {
        case ' ':
            return 'empty';
        case 'g':
            return 'gold_mine';
        case 'h':
            return 'home';
        case 'e':
            return 'energy_well';
        case 'f':
            return 'fortress';
        default:
            console.log(letter);
    }
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
        actionChannel = new WebSocket(gameProtocol + window.location.host + window.location.pathname.substr(0, window.location.pathname.lastIndexOf('/')) + "/action_channel");
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

function queue_fortress(x, y) {
    turnCommands.cmd_list.push(CMD_BUILD   + ' ' + x + ' ' + y + ' ' + BLD_FORTRESS);
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
    const users     = Object.entries(gameData['users']).sort((a, b) => b[1]['gold'] - a[1]['gold']);

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
        userGold.style.marginLeft = 'auto';
        userGold.className += ' pl-1 user-gold-p';
        userDiv.appendChild(userGold);

        // Append the row to the list. 
        listHTML.appendChild(userDiv);

        // Draw a bottom border if not the last user. 
        if (uid != users[users.length - 1][0]) {
            // Draw a bottom border. 
            userDiv.style.borderStyle = "solid";
            userDiv.style.borderColor = "#C5D3D4";
            userDiv.style.borderWidth = "0px 0px 1px 0px";
        }
    }
}

function update_selected_user() {
    // Hover has priority over click. 
    if (hoverUID == SENTINEL_UID) {
        let hoveredCellInfo = false;
        if (gameData && gameData['game_map']) {
            hoveredCellInfo = gameData['game_map'][hoverCell[1]][hoverCell[0]];
        }
        if (hoveredCellInfo && hoveredCellInfo['owner'] != SENTINEL_UID) {
            selectUID = hoveredCellInfo['owner'];
        } else {
            selectUID = clickUID; 
        }
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
    userColorBox.style.backgroundColor  = id_to_color(uid);

    // Construct the row. 
    userBoxDiv.appendChild(userColorBox);
    userBoxDiv.appendChild(create_p(username));

    return userBoxDiv;
}

////////////////////////////////////////////////////////////////////////////////

// Default user when no UID is specified, but we want to fill in the infos. 
const defaultUser = { 
    'uid'             : 0, 
    'username'        : 'None', 
    'energy'          : 0, 
    'gold'            : 0, 
    'dead'            : false, 
    'tech_level'      : 0, 
    'energy_source'   : 0, 
    'gold_source'     : 0, 
    'tax_amount'      : 0,
    'building_number' : {},
    'cells'           : [], 
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

    // The last time we tried to join, we used {selfUsername}. 
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
        selfHeader = create_p('USER INFO');
        selfHeader.className = 'game-status-header';
        selfHTML.appendChild(selfHeader);

        selfHTML.appendChild(create_user_info(selfUID, get_user_info(selfUID))); 
    }
}

// Draw the SELECTED USER INFO section. 
function draw_selected_user_info() {
    const userHTML = document.getElementById('selected-user-info');
    clear_div(userHTML); 

    userHeader = create_p('SELECTED USER INFO')
    userHeader.className = 'game-status-header'
    userHTML.appendChild(userHeader)

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
    // cells owned / total cells  energy_well num  gold_mine num  fortress num
    // energy_icon energy + energy_source - tax_amount
    // gold_icon   gold   + gold_source   - tax_amount

    const userDiv       = document.createElement('div');
    userDiv.className   = 'game-status-section';

    ////////////////////////////////////////////////////////////////////////////
    // Construct the resource table as vertically-aligned columns. 

    // Create 4 vertical columns. 
    // Create 2 rows per column, one per resource. 
    // | Total | + | Rate | Type |

    // Construct the internal node strings. 
    const energyTotal   = create_p(user['energy'], {'img_src': '/static/assets/energy_icon.png'});
    const goldTotal     = create_p(user['gold'],   {'img_src': '/static/assets/gold_icon.png'});
    // Right align toward the '+'. 
    energyTotal.className   = 'text-right';
    goldTotal.className     = 'text-right';

    const userCellTable = [
        [create_p(user['cells'].length + '/' + GAME_MAX_CELLS)],
        [create_p(user['building_number']['energy_well'] || 0, {'img_src': '/static/assets/energy_well_icon.png'})],
        [create_p(user['building_number']['gold_mine']   || 0, {'img_src': '/static/assets/gold_mine_icon.png'})],
        [create_p(user['building_number']['fortress']    || 0, {'img_src': '/static/assets/fortress_icon.png'})],
    ];

    // Create a set of nodes by [column][row]. 
    const userResourceTable = [
        [energyTotal,                    
                      goldTotal                     ], 
        [create_p('+'),                  
                      create_p('+')                 ], 
        [create_p(user['energy_source'], {"class":"resource-incr-p"}), 
                      create_p(user['gold_source'], {"class":"resource-incr-p"}) ], 
        [create_p('-'), 
                      create_p('-')                 ], 
        [create_p(user['tax_amount'], {"class":"resource-decr-p"}), 
                      create_p(user['tax_amount'], {"class":"resource-decr-p"}) ], 
    ]; 

    ///////////////////////////////////////////////////////
    // Construct the whole user info div. 

    // Construct the user box. 
    userDiv.appendChild(create_user_box(uid, user['username']));
    // Construct the tech level info. 
    userDiv.appendChild(create_p('Tech Level: ' + user['tech_level']));
    // Construct the cell count info. 
    userDiv.appendChild(create_flex_table(userCellTable, colClass = "pr-1"));
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
        cellHeader = create_p('SELECTED CELL INFO')
        cellHeader.className = 'game-status-header'
        cellHTML.appendChild(cellHeader)

        if (gameRenderer.plugins.interaction.mouseOverRenderer) {
            cellHTML.appendChild(create_cell_info(hoverCell[0], hoverCell[1]));
        }
        else if (clickCell != false) {
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
    const energyRate        = create_p(cell['energy'], {'img_src': '/static/assets/energy_icon.png'});
    const goldRate          = create_p(cell['gold'],   {'img_src': '/static/assets/gold_icon.png'});
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
    ]; 

    ////////////////////////////////////////////////////////////////////////////
    // Construct building string. 

    const building        = cell['building'];
    const buildingString  = 'LV. ' + building['level'] + ' ' + capitalize_first(building['name']); 

    ////////////////////////////////////////////////////////////////////////////
    // Construct the attack cost string. 

    let costString = 'Cost: ';
    let attackCost = cell['attack_cost'];
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

    buttonDiv.appendChild(create_button('Clear Selection', cell_click_clear_handler)); 

    // TODO: Investigate why button clicks are inconsistent. 

    if (selfUID != SENTINEL_UID) {
        // We are in the game. Draw possible action buttons. 
        let selfData = gameData['users'][selfUID];

        if (ownerUID == selfUID) {
            // We are the owner. We can either build or upgrade. 
            if (building['name'] == 'empty') {
                // There is no building. Draw building choices. 
                buttonDiv.appendChild(create_cell_button('Build Well', 
                    BASE_BUILD_COST, function(){queue_well(x, y);})); 
                buttonDiv.appendChild(create_cell_button('Build Mine', 
                    BASE_BUILD_COST, function(){queue_mine(x, y);})); 
                buttonDiv.appendChild(create_cell_button('Build Fort', 
                    BASE_BUILD_COST, function(){queue_fortress(x, y);})); 
            }
            else {
                // There is a building. Draw upgrade choice. 
                let upgradeLevel = building['level'];
                if (upgradeLevel < GAME_MAX_LEVEL) {
                    // Can upgrade further. 
                    let canUpgrade  = true; 
                    if (building['name'] == 'home') {
                        // Home has a base cost of 1000. 
                        // Cost doubles per level. 
                        let cost = 1000 * Math.pow(2, upgradeLevel - 1); 
                        buttonDiv.appendChild(create_button(
                            'Upgrade: (' + cost + ', ' + cost + ')', 
                            function(){queue_upgrade(x, y);}));
                    }
                    else if (upgradeLevel < selfData['tech_level']) {
                        // Cost doubles per level. 
                        let cost = BASE_BUILD_COST * Math.pow(2, upgradeLevel);
                        buttonDiv.appendChild(create_cell_button('Upgrade', 
                            cost, function(){queue_upgrade(x, y);})); 
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
                let minAttack   = attackCost;
                // Max attack. Enough to max out the force field. 
                let maxAttack   = Math.max(minAttack + 300, GAME_MAX_ATTACK); 

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

function create_cell_button(name, cost, click_handler) {
    return create_button(name + ': ' + '(0, ' + cost + ')', click_handler); 
}

function create_button(text, click_handler)
{
    let p = document.createElement('p');
    let button = document.createElement('BUTTON');
    button.innerHTML    = text; 
    button.onclick      = click_handler; 
    p.appendChild(button);
    return p; 
}

////////////////////////////////////////////////////////////////////////////////

// Create a 2D vertical-aligned flex table from a 2D table of nodes. 
function create_flex_table(tableNodes, colClass = "")
{
    // Create a d-flex table. 
    const tableDiv      = document.createElement('div');
    tableDiv.className  = 'd-flex';

    // Construct the table out of the nodes specified above. 
    for (let i = 0; i < tableNodes.length; i++) {
        let colDiv      = document.createElement('div');
        let colNodes    = tableNodes[i]; 
        
        // Apply column classes
        if (colClass) {
            colDiv.className += " " + colClass;
        }

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
function create_p(text, args = {}) {
    const node = document.createElement('p');
    node.appendChild(document.createTextNode(text));
    if ('img_src' in args) {
        add_img_before(node, args['img_src'])
    }
    if ('class' in args) {
        node.className = args['class'];
    }
    if ('color' in args) {
        node.style.color = args['color'];
    }
    return node; 
}

function add_img_before(node, src) {
    node.style.backgroundImage = 'url("' + src + '")';
    node.style.backgroundRepeat = 'no-repeat';
    node.style.paddingLeft = "1.5vw";
    node.style.backgroundSize  = "contain";
    return node;
}

// Clear an entire div. 
function clear_div(divHTML) {
    while (divHTML.firstChild) {
        divHTML.firstChild.remove();
    }
}

// Capitalize the first character in a string. 
function capitalize_first(string) {
    return string.charAt(0).toUpperCase() + string.slice(1); 
}

////////////////////////////////////////////////////////////////////////////////
