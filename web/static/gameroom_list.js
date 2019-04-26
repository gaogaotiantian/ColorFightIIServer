let delete_room_name = "";

function createGameroom( data ) {
    if (data && data['gameroom_id']) {
        $.ajax( {
            url: "/creategameroom",
            method: "POST",
            dataType: "json",
            contentType: "application/json;charset=UTF-8",
            data: JSON.stringify( data ),
            success: function(msg) {
                if (msg['success']) {
                    document.location.reload();
                } else {
                    alert(msg['err_msg']);
                }
            }
        } );
    }
}

function deleteGameroom( data ) {
    if (data && data['gameroom_id']) {
        $.ajax( {
            url: "/deletegameroom",
            method: "POST",
            dataType: "json",
            contentType: "application/json;charset=UTF-8",
            data: JSON.stringify( data ),
            success: function(msg) {
                if (msg['success']) {
                    document.location.reload();
                } else {
                    alert(msg['err_msg']);
                }
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

    var join_key = $( '#join-key-input' ).val();
    if (join_key) {
        data['join_key'] = join_key;
    }

    return data;
}

$(function() {
    $( '#create-gameroom-button' ).click( function() {
        createGameroom( getConfig() );
    });

    $( '#delete-gameroom-button' ).click( function() {
        deleteGameroom( {
            "admin_password": $('#delete-admin-password-input').val(),
            "gameroom_id": delete_room_name
        } )
    });

    $('body').on('click', '.game-room-tr', function(e) {
        if (!$(e.target).hasClass('delete-room-icon')) {
            window.location.replace($(this).attr('href'));
        } else {
            delete_room_name = $(this).find(".gameroom-name-div").text().trim();
        }
    });
})
