// The replay data
var fullGameData = {};
var replayCurrTurn = 0;
var replayMaxTurn = 0;
var changeFrame = true;

// Replay mode parameters
var replayStatus = 'invalid';
const possibleReplaySpeed = [0.125, 0.25, 0.5, 1, 2, 3, 4];
var replaySpeedIdx = 3;

function load_file() {
    let file = document.getElementById('replay-file-input').files[0];
    fr = new FileReader();
    fr.onloadend = function(e) {
        try {
            let raw = pako.inflate(fr.result, {to:'string'});
            let data = JSON.parse(raw);
            load_data(data);
        }
        catch (exception) {
            console.log(exception)
            alert("Wrong replay file!");
        }
    }
    fr.readAsArrayBuffer(file);
}

function load_data(data) {
    let info = {};
    let game_map_data = [];
    let game_map_headers = [];
    for (var i = 0; i < data.length; i++) {
        let round_data  = data[i];
        fullGameData[i] = JSON.parse(JSON.stringify(data[i]));
        if (i == 0) {
            info = round_data['info'];
            info["start_count_down"] = 0;
            game_map_data    = round_data['game_map']['data'];
            game_map_headers = round_data['game_map']['headers'];
        } else {
            fullGameData[i]['info'] = info;
            fullGameData[i]['users'] = round_data['users'];
            let round_game_map_data = [];
            for (let i = 0; i < game_map_data.length; i++) {
                for (let j = 0; j < game_map_data[0].length; j++) {
                    if (round_data['game_map']['data'][i][j].length == 0) {
                        round_game_map_data.push(game_map_data[i][j]);
                    } else {
                        round_game_map_data.push(round_data['game_map']['data'][i][j]);
                        game_map_data[i][j] = round_data['game_map']['data'][i][j];
                    }
                }
            }
            fullGameData[i]['game_map']['headers'] = game_map_headers;
            fullGameData[i]['game_map']['data'] = JSON.parse(JSON.stringify(game_map_data));
        }
    }
    replayCurrTurn = 0;
    replayMaxTurn = data.length - 1;
    replayStatus = 'play';
    changeFrame = true;
    var slider = document.getElementById('replay-slider');
    slider.max = replayMaxTurn;
    slider.value = 0;
}

function play_loop() {
    if (replayStatus != 'invalid') {
        data = JSON.parse(JSON.stringify(fullGameData[replayCurrTurn]));
        if (replayStatus == 'play' && replayCurrTurn < replayMaxTurn) {
            replayCurrTurn += 1;
        }
        update_panels();
        parse_game_data_and_draw(data);
    }
    setTimeout(play_loop, possibleReplaySpeed[replaySpeedIdx] * 1000);
}

function update_panels() {
    var slider = document.getElementById('replay-slider');
    slider.value = replayCurrTurn;
    if (replayStatus == 'pause' || replayStatus == 'invalid') {
        $('#replay-play-button-div').show();
        $('#replay-pause-button-div').hide();
    } else {
        $('#replay-play-button-div').hide();
        $('#replay-pause-button-div').show();
    }
}

$(function() {
    $('#replay-file-load-button').click(function(e) {
        $('#replay-file-input').click();
    })

    $('#replay-file-input').change(function() {
        load_file();
    })

    $('#replay-play-button').click(function() {
        replayStatus = 'play';
    })

    $('#replay-pause-button').click(function() {
        replayStatus = 'pause';
    })

    $('#replay-slow-button').click(function() {
        replaySpeedIdx = Math.min(possibleReplaySpeed.length - 1, replaySpeedIdx + 1);
    })

    $('#replay-fast-button').click(function() {
        replaySpeedIdx = Math.max(0, replaySpeedIdx - 1);
    })

    $('#replay-step-back-button').click(function() {
        if (replayCurrTurn > 0) {
            replayStatus = 'pause';
            replayCurrTurn = replayCurrTurn - 1;
        }
    })

    $('#replay-step-forward-button').click(function() {
        if (replayCurrTurn < replayMaxTurn) {
            replayStatus = 'pause';
            replayCurrTurn = replayCurrTurn + 1;
        }
    })

    document.getElementById('replay-slider').oninput = function() {
        var slider = document.getElementById('replay-slider');
        replayCurrTurn = parseInt(slider.value);
        replayStatus = 'pause';
    }
    var queryDict = {}
    location.search.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]});
    if ('loaded' in queryDict) {
        console.log(123)
        if (queryDict['loaded'] == "true") {
            console.log(234)
            let raw_data = sessionStorage.getItem('rawGameData');
            load_data(JSON.parse(raw_data));
        } 
    }

    play_loop();
})
