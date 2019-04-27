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
            } else {
                location.reload();
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

    var allow_manual_mode = $( "#allow-manual-mode-sel option:selected" ).val();
    if( allow_manual_mode != "same" ) {
        config[ "allow_manual_mode" ] = (allow_manual_mode == "true");
    }

    var replay_enable = $( "#replay-enable-sel option:selected" ).val();
    if( replay_enable != "same" ) {
        config[ "replay_enable" ] = replay_enable;
    }

    data['config'] = config;
    data['gameroom_id'] = window.location.pathname.split('/')[2];

    return data;
}

/* View in fullscreen */
function openFullscreen(elem) {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
    }
}

/* Close fullscreen */
function closeFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { /* Firefox */
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE/Edge */
        document.msExitFullscreen();
    }
}

function fullScreenHandler() {
    if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
        ///fire your event
        $(' #expand-button ').show();
        $(' #compress-button' ).hide();
    } else {
        $(' #expand-button ').hide();
        $(' #compress-button' ).show();
    }
}  
$( function() {
    $( '#restart-button' ).click( function() {
        restartGame( getConfig() );
    } );

    document.addEventListener('fullscreenchange', fullScreenHandler);
    document.addEventListener('webkitfullscreenchange', fullScreenHandler);
    document.addEventListener('mozfullscreenchange', fullScreenHandler);
    document.addEventListener('MSFullscreenChange', fullScreenHandler);

    $( '#expand-button' ).click( function() {
        openFullscreen(document.documentElement);
    } );

    $( '#compress-button ').click( function() {
        closeFullscreen();
    } );

    $( '#download-button' ).click( function() {
        console.log($(this).attr('enable_condition'))
        if ($(this).attr('enable_condition') == 'always' || 
                ($(this).attr('enable_condition') == 'end' && lastTurn == maxTurn)) {
            let a = document.createElement('a');
            a.href = './replay';
            a.download = 'replay.cfr';
            a.click();
        } else {
            alert("You can't download replay now!");
        }
    })
} );
