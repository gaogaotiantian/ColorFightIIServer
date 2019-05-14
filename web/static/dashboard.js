var db = firebase.firestore();

function update_game_auth(username, password) {
    let user = firebase.auth().currentUser;
    if (user) {
        let user_check = db.collection('users').where("game_username", "==", username);
        user_check.get().then(function(querySnapshot) {
            if (querySnapshot.size != 0) {
                alert("Username is taken!")
            } else {
                let user_ref = db.collection('users').doc(user.uid);
                user_ref.get().then(function(doc) {
                    if (doc.exists) {
                        user_ref.update({
                            "game_username": username,
                            "game_password": password
                        }).then(function() {
                            window.location.reload();
                        })
                    }
                })
            }
        })
    } else {
        console.log("No authed user!")
    }
}

function init_dashboard(user) {
    let user_ref = db.collection('users').doc(user.uid);
    user_ref.get().then(function(doc) {
        if (doc.exists) {
            update_dashboard(doc.data());
        } else {
            let init_data = {
                "game_username": "",
                "game_password": "",
                "game_ranking": 0,
                "replays" : []
            }
            user_ref.set(init_data);
            update_dashboard(init_data);
        }
    })
}

function update_dashboard(data) {
    $('#game-auth-username-input').addClass("d-none");
    $('#game-auth-password-input').addClass("d-none");
    $('#game-auth-change-confirm').addClass("d-none");
    $('#game-auth-change-cancel').addClass("d-none");
    if (data.game_username) {
        $('#game-auth-username').text(data.game_username);
    } else {
        $('#game-auth-username').text("N/A");
    }
    if (data.game_password) {
        $('#game-auth-password').text(data.game_password);
    } else {
        $('#game-auth-password').text("N/A");
    }
    if ("game_ranking" in data) {
        $('#game-ranking').text(data.game_ranking);
    } else {
        $('#game-ranking').text("N/A");
    }
}

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        init_dashboard(user);
    }
})

$(function() {
    $('#game-auth-change').click(function() {
        $('#game-auth-username').addClass("d-none");
        $('#game-auth-password').addClass("d-none");
        $('#game-auth-username-input').removeClass("d-none");
        $('#game-auth-password-input').removeClass("d-none");
        $('#game-auth-change-confirm').removeClass("d-none");
        $('#game-auth-change').addClass("d-none");
        $('#game-auth-change-confirm').removeClass("d-none");
        $('#game-auth-change-cancel').removeClass("d-none");
    })

    $('#game-auth-change-cancel').click(function() {
        $('#game-auth-username').removeClass("d-none");
        $('#game-auth-password').removeClass("d-none");
        $('#game-auth-username-input').addClass("d-none");
        $('#game-auth-password-input').addClass("d-none");
        $('#game-auth-change-confirm').addClass("d-none");
        $('#game-auth-change').removeClass("d-none");
        $('#game-auth-change-confirm').addClass("d-none");
        $('#game-auth-change-cancel').addClass("d-none");
    })

    $('#game-auth-change-confirm').click(function() {
        let username = $('#game-auth-username-input').val();
        let password = $('#game-auth-password-input').val();
        if (username && password) {
            update_game_auth(username, password);
        }
    })
})