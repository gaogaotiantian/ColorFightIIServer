firebase.initializeApp({
    apiKey: 'AIzaSyDtvyYNODSMcNw6Z__3BurnaKvW8wofOyg',
    authDomain: 'colorfightai.com',
    storageBucket: 'colorfightai-firebase.appspot.com',
    projectId: 'colorfightai-firebase',
})

var db = firebase.firestore();
var storage = firebase.storage();
var page = 1;
var REPLAYS_PER_PAGE = 20;

function download_replay(game_id) {
    var ref = storage.ref('replays/'+game_id.toString()+'.cfr');

    ref.getDownloadURL().then(function(url) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'blob';
        xhr.onload = function(event) {
            var blob = xhr.response;
            var url = URL.createObjectURL(blob);
            var a   = document.createElement('a');
            a.href = url;
            a.download = game_id.toString() + '.cfr';
            a.click();
        };
        xhr.open('GET', url);
        xhr.send();
    })
}

function play_replay(game_id) {
    window.location.href = '/replay/' + game_id + '?load=true';
}

function add_img_before(node, src) {
    node.style.backgroundImage = 'url("' + src + '")';
    node.style.backgroundRepeat = 'no-repeat';
    node.style.paddingLeft = "1.5vw";
    node.style.backgroundSize  = "contain";
    return node;
}

function create_replay_detail_div(users) {
    const wrapper = document.createElement('div');
    wrapper.className = "detail-info col-12 collapse"

    for (let uid in users) {
        let user = users[uid][1];
        const user_wrapper = document.createElement('div');
        const username_div = document.createElement('div');
        const energy_div   = document.createElement('div');
        const gold_div     = document.createElement('div');

        user_wrapper.className = "row";
        username_div.className = "col-md-6";
        energy_div.className   = "col-md-3";
        gold_div.className     = "col-md-3";

        username_div.innerHTML = user['username'];
        gold_div.innerHTML     = user['gold'];
        energy_div.innerHTML   = user['energy'];
        add_img_before(gold_div, '/static/assets/gold_icon.png');
        add_img_before(energy_div, '/static/assets/energy_icon.png');

        user_wrapper.appendChild(username_div);
        user_wrapper.appendChild(gold_div);
        user_wrapper.appendChild(energy_div);
        wrapper.appendChild(user_wrapper);
    }

    return wrapper;
}

function create_replay_download_button(game_id) {
    const wrapper = document.createElement('a');

    wrapper.className = "control-button download-button-a px-1";
    wrapper.href      = "#";
    wrapper.innerHTML = '<i class="control-button fas fa-download"></i>';
    wrapper.onclick   = function(){download_replay(game_id)};

    return wrapper;
}

function create_replay_play_button(game_id) {
    const wrapper = document.createElement('a');

    wrapper.className = "control-button play-button-a px-1";
    wrapper.href      = "#";
    wrapper.innerHTML = '<i class="control-button fas fa-play"></i>';
    wrapper.onclick   = function(){play_replay(game_id)};

    return wrapper;
}

function create_replay_div(replay_data) {
    let wrapper      = document.createElement('div');
    let name_col     = document.createElement('div');
    let username_col = document.createElement('div');
    let time_col     = document.createElement('div');
    let option_col   = document.createElement('div');
    let detail_col   = null;

    let users = Object.keys(replay_data['users']).map(function(key) {
        return [key, replay_data['users'][key]]
    });

    users.sort(function(a, b) {
        return b[1]['gold'] - a[1]['gold'];
    })

    detail_col = create_replay_detail_div(users);
    detail_col.setAttribute('game_id', replay_data['game_id'].toString());

    wrapper.className      = "table-row table-row-content row replay-row";
    wrapper.setAttribute('game_id', replay_data['game_id']);
    name_col.className     = "table-column col-3";
    username_col.className = "table-column col-3";
    time_col.className     = "table-column col-4";
    option_col.className   = "table-column col-2 text-right";

    name_col.innerHTML     = replay_data['game_id'];
    username_col.innerHTML = users[0][1]['username'];
    time_col.innerHTML     = new Date(replay_data['timestamp']*1000).toLocaleString();
    option_col.appendChild(create_replay_download_button(replay_data['game_id']));
    option_col.appendChild(create_replay_play_button(replay_data['game_id']));

    wrapper.appendChild(name_col);
    wrapper.appendChild(username_col);
    wrapper.appendChild(time_col);
    wrapper.appendChild(option_col);
    wrapper.appendChild(detail_col);

    return wrapper;
}

function update_page(replay_lists) {
    let container = document.getElementById('replay-content-container');
    container.innerHTML = "";

    replay_lists.forEach(function(doc) {
        let d = create_replay_div(doc.data());
        container.appendChild(d);
    })
}

function show_detail(game_id) {
    $('.replay-row').each(function() {
        if ($(this).attr('game_id') == game_id) {
            $(this).find('.detail-info').toggle();
        } else {
            $(this).find('.detail-info').hide();
        }
    })
}

$(function() {
    // Replay buttons
    //
    $('#replay-file-load-button').click(function(e) {
        window.location.href='/replay/local';
    })

    $('#replay-file-input').change(function() {
        load_file();
    })

    $('body').on('click', '.replay-row', function(e) {
        if (!$(e.target).hasClass('control-button')) {
            show_detail($(this).attr('game_id'));
        }
    })

    db.collection("replays")
        .orderBy("timestamp", "desc")
        .limit(REPLAYS_PER_PAGE)
        .get()
        .then(function(snapshot) {
            update_page(snapshot);
        })
});
