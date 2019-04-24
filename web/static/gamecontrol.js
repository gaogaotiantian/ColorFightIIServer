function restartGame( data ) {
    $.ajax( {
        url: "/restart",
        method: "POST",
        dataType: "json",
        contentType: 'application/json;charset=UTF-8',
        data: JSON.stringify( data ),
        success: function(msg) {
            if (!msg['success']) {
                alert(msg['err_msg']);
            }
        }
    } );
}

function getConfig() {
    var data = {};
    var config = {};

    var password = $( "#admin-password-input" ).val();
    if (password) {
        data[ "admin_password" ] = password;
    }

    var max_turn = $( "#max-turn-sel option:selected" ).val();
    if( max_turn != "same" ) {
        config[ "max_turn" ] = parseFloat( max_turn );
    }

    var round_time = $( "#round-time-sel option:selected" ).val();
    if( round_time != "same" ) {
        config[ "round_time" ] = parseFloat( round_time );
    }

    var first_round_time = $( "#first-round-time-sel option:selected" ).val();
    if( first_round_time != "same" ) {
        config[ "first_round_time" ] = parseFloat( first_round_time );
    }

    var finish_time = $( "#finish-time-sel option:selected" ).val();
    if( finish_time != "same" ) {
        config[ "finish_time" ] = parseFloat( finish_time );
    }

    var allow_join_after_start = $( "#allow-join-after-start-sel option:selected" ).val();
    if( allow_join_after_start != "same" ) {
        config[ "allow_join_after_start" ] = (allow_join_after_start == "true");
    }

    data['config'] = config;
    data['gameroom_id'] = window.location.pathname.substr(window.location.pathname.lastIndexOf('/')+1);

    return data;
}

$( function() {
    $( '#restart-button' ).click( function() {
        restartGame( getConfig() );
    } );
} );
