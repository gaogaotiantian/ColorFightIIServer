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

function update_personal_info(school) {
    let user = firebase.auth().currentUser;
    if (user) {
        let user_ref = db.collection('users').doc(user.uid);
        user_ref.get().then(function(doc) {
            if (doc.exists) {
                user_ref.update({
                    "school": school,
                }).then(function() {
                    window.location.reload();
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
                "game_ranking_mean": 25,
                "game_ranking_dev": 8.33333333,
                "school": "",
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
    $('#personal-info-change-confirm').addClass("d-none");
    $('#personal-info-change-cancel').addClass("d-none");
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
    if (data.school) {
        $('#personal-info-school').text(data.school);
    } else {
        $('#personal-info-school').text("");
    }
    if ("game_ranking_mean" in data && "game_ranking_dev" in data) {
        $('#game-ranking').text((data.game_ranking_mean - 3 * data.game_ranking_dev).toFixed(2));
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
        $('#game-auth-change').addClass("d-none");
        $('#game-auth-change-confirm').removeClass("d-none");
        $('#game-auth-change-cancel').removeClass("d-none");
    })

    $('#game-auth-change-cancel').click(function() {
        $('#game-auth-username').removeClass("d-none");
        $('#game-auth-password').removeClass("d-none");
        $('#game-auth-username-input').addClass("d-none");
        $('#game-auth-password-input').addClass("d-none");
        $('#game-auth-change').removeClass("d-none");
        $('#game-auth-change-confirm').addClass("d-none");
        $('#game-auth-change-cancel').addClass("d-none");
    })

    $('#personal-info-change').click(function() {
        $('#personal-info-school').addClass("d-none");
        $('#personal-info-school-input').removeClass("d-none");
        $('#personal-info-change').addClass("d-none");
        $('#personal-info-change-confirm').removeClass("d-none");
        $('#personal-info-change-cancel').removeClass("d-none");
    })

    $('#personal-info-change-cancel').click(function() {
        $('#personal-info-school').removeClass("d-none");
        $('#personal-info-school-input').addClass("d-none");
        $('#personal-info-change').removeClass("d-none");
        $('#personal-info-change-confirm').addClass("d-none");
        $('#personal-info-change-cancel').addClass("d-none");
    })

    $('#game-auth-change-confirm').click(function() {
        let username = $('#game-auth-username-input').val();
        let password = $('#game-auth-password-input').val();
        if (username && password) {
            update_game_auth(username, password);
        }
    })

    $("#personal-info-change-confirm").click(function() {
        let school = $('#personal-info-school-input').val();
        if (school) {
            update_personal_info(school);
        }
    })
})
