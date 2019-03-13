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
