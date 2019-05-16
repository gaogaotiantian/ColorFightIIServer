function createUserDiv(rank, username, score) {
    const wrapper     = document.createElement('div');
    const rankDiv     = document.createElement('div');
    const usernameDiv = document.createElement('div');
    const scoreDiv    = document.createElement('div');

    wrapper.className     = "row";
    rankDiv.className     = "col-2";
    usernameDiv.className = "col-7";
    scoreDiv.className    = "col-3";

    rankDiv.innerHTML  = rank;
    usernameDiv.innerHTML = username;
    scoreDiv.innerHTML    = score;

    wrapper.appendChild(rankDiv);
    wrapper.appendChild(usernameDiv);
    wrapper.appendChild(scoreDiv);

    return wrapper
}

function draw_leaderboard() {
    var arr = [];
    var ref = firebase.database().ref('/leaderboard').orderByChild('score').limitToLast(100);
    ref.once('value', function(snapshot) {
        snapshot.forEach(function(child) {
            arr.push([child.key, child.val()]);
        })
        let container = document.getElementById('leaderboard-content');
        container.innerHTML = "";
        for (let idx = arr.length-1; idx >= 0; idx --) {
            let user = arr[idx];
            let username = user[0];
            let userdata = user[1];
            let rank = arr.length - idx;
            container.appendChild(createUserDiv(rank, username, userdata['score'].toFixed(2)));
        }
    })
}

$(function() {
    draw_leaderboard()
})
