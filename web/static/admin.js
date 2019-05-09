function send_admin() {
    var data = {}
    var admin_password = $('#admin-password-input').val();
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

$(function() {
    $('#submit-button').click(function() {
        send_admin();
    })
})
