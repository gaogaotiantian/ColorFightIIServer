function createUserDiv(rank, username, score, school) {
    const wrapper     = document.createElement('div');
    const rankDiv     = document.createElement('div');
    const usernameDiv = document.createElement('div');
    const schoolDiv   = document.createElement('div');
    const scoreDiv    = document.createElement('div');

    wrapper.className     = "row";
    rankDiv.className     = "col-1";
    usernameDiv.className = "col-4";
    schoolDiv.className    = "col-5";
    scoreDiv.className    = "col-2";

    rankDiv.innerHTML     = rank;
    usernameDiv.innerHTML = username;
    schoolDiv.innerHTML      = school;
    scoreDiv.innerHTML    = score;

    wrapper.appendChild(rankDiv);
    wrapper.appendChild(usernameDiv);
    wrapper.appendChild(schoolDiv);
    wrapper.appendChild(scoreDiv);

    return wrapper;
}

function draw_leaderboard() {
    let curr_time = new Date().getTime();
    let expire_time = 5*60*1000;
    let arr = [];
    if (sessionStorage.getItem('leaderboard_data') && 
            parseFloat(sessionStorage.getItem('leaderboard_data_timestamp')) > curr_time - expire_time) {
        arr = JSON.parse(sessionStorage.getItem('leaderboard_data'));
        draw_leaderboard_with_data(arr);
    } else {
        var ref = firebase.database().ref('/leaderboard').orderByChild('score').limitToLast(100);
        ref.once('value', function(snapshot) {
            snapshot.forEach(function(child) {
                arr.push([child.key, child.val()]);
            })
            draw_leaderboard_with_data(arr);
            sessionStorage.setItem('leaderboard_data', JSON.stringify(arr));
            sessionStorage.setItem('leaderboard_data_timestamp', curr_time);
        })
    }
}

function draw_leaderboard_with_data(arr) {
    let container = document.getElementById('leaderboard-content');
    container.innerHTML = "";
    for (let idx = arr.length-1; idx >= 0; idx --) {
        let user = arr[idx];
        let username = user[0];
        let userdata = user[1];
        let rank = arr.length - idx;
        container.appendChild(createUserDiv(rank, username, userdata['score'].toFixed(2), userdata['school']));
    }
}

$(function() {
    draw_leaderboard()
})
