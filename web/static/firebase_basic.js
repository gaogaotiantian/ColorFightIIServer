firebase.initializeApp({
    apiKey: 'AIzaSyDtvyYNODSMcNw6Z__3BurnaKvW8wofOyg',
    authDomain: 'colorfightai-firebase.firebaseapp.com',
    storageBucket: 'colorfightai-firebase.appspot.com',
    projectId: 'colorfightai-firebase',
})

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        $('#signin-div').addClass("d-none");
        $('#logged-user-div').removeClass("d-none");
    } else {
        $('#signin-div').removeClass("d-none");
        $('#logged-user-div').addClass("d-none");
    }
})

$(function() {
    $('#sign-out-button').click(function() {
        firebase.auth().signOut();
    })
})