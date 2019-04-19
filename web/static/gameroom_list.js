function createGameroom( data ) {
    if (data && data['gameroom_id']) {
        $.ajax( {
            url: "/creategameroom",
            method: "POST",
            dataType: "json",
            contentType: "application/json;charset=UTF-8",
            data: JSON.stringify( data ),
            success: function(msg) {
                document.location.reload()
            }
        } );
    }
}

function getConfig() {
    var data = {};
    data['gameroom_id'] = $( '#gameroom-name' ).val();

    var admin_password = $( '#admin-password-input' ).val();
    if (admin_password) {
        data['admin_password'] = admin_password;
    }

    return data;
}

$(function() {
    $( '#create-gameroom-button' ).click( function() {
        createGameroom( getConfig() );
    });
    $('body').on('click', '.game-room-tr', function() {
        window.location.replace($(this).attr('href'));
    });
})
