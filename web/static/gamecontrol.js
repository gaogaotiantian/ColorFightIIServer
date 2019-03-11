function restartGame( data ) {
    $.ajax( {
        url: "http://colorfightii.herokuapp.com/restart",
        method: "POST",
        dataType: "json",
        contentType: 'application/json;charset=UTF-8',
        data: JSON.stringify( data ),
        success: function(msg) {

        }
    } );
}

function getConfig() {
    var data = {};
    var max_turn = $( "#max-turn-sel option:selected" ).val();
    if( max_turn != "same" ) {
        data[ "max_turn" ] = parseFloat( max_turn );
    }

    var round_time = $( "#round-time-sel option:selected" ).val();
    if( round_time != "same" ) {
        data[ "round_time" ] = parseFloat( round_time );
    }

    var first_round_time = $( "#first-round-time-sel option:selected" ).val();
    if( first_round_time != "same" ) {
        data[ "first_round_time" ] = parseFloat( first_round_time );
    }

    var finish_time = $( "#finish-time-sel option:selected" ).val();
    if( first_round_time != "same" ) {
        data[ "finish_time" ] = parseFloat( finish_time );
    }

    return data;
}

$( function() {
    $( '#restart-button' ).click( function() {
        restartGame( getConfig() );
    } );
} );
