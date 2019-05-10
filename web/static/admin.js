function send_admin() {
    var data = {}
    var admin_password = $('#config-admin-password-input').val();
    if (admin_password) {
        data['admin_password'] = admin_password;
    }

    var max_gameroom_number = $('#max-gameroom-number-input').val();
    if (max_gameroom_number) {
        data['max_gameroom_number'] = parseInt(max_gameroom_number);
    }

    var idle_clear_time = $('#idle-clear-time-input').val();
    if (idle_clear_time) {
        data['idle_clear_time'] = parseInt(idle_clear_time);
    }

    var allow_create_room = $( "#allow-create-room-sel option:selected" ).val();
    if (allow_create_room != "same") {
        data["allow_create_room"] = allow_create_room == "true";
    }

    if ('admin_password' in data && data['admin_password']) {
        $.ajax( {
            url: "/configadmin",
            method: "POST",
            dataType: "json",
            contentType: 'application/json;charset=UTF-8',
            data: JSON.stringify( data ),
            success: function(msg) {
                if (!msg['success']) {
                    alert(msg['err_msg']);
                } else {
                    window.location.reload();
                }
            }
        } );
    } else {
        alert("Enter password!")
    }
}

function createAdminGameroom() {
    var data = {};
    data['gameroom_id'] = $( '#gameroom-name' ).val();

    var master_admin_password = $( '#master-admin-password-input' ).val();
    if (master_admin_password) {
        data['master_admin_password'] = master_admin_password;
    }

    var admin_password = $( '#admin-password-input' ).val();
    if (admin_password) {
        data['admin_password'] = admin_password;
    }

    var join_key = $( '#join-key-input' ).val();
    if (join_key) {
        data['join_key'] = join_key;
    }

    var config = $( '#config-input option:selected' ).val();
    if (config) {
        data['config'] = config;
    }
    if (data && data['gameroom_id']) {
        $.ajax( {
            url: "/creategameroom?admin=true",
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

function deleteAdminGameroom( data ) {
    if (data && data['gameroom_id']) {
        $.ajax( {
            url: "/deletegameroom?admin=true",
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

$(function() {
    $('#submit-button').click(function() {
        send_admin();
    })

    $('#create-gameroom-button').click(function() {
        createAdminGameroom();
    })

    $( '#delete-gameroom-button' ).click( function() {
        deleteAdminGameroom( {
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
