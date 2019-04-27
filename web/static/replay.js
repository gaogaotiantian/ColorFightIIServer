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
    console.log(123)
    fr.onloadend = function(e) {
        try {
            let raw = pako.inflate(fr.result, {to:'string'});
            let data = JSON.parse(raw);
            for (var i = 0; i < data.length; i++) {
                fullGameData[i] = JSON.parse(data[i]);
            }
            replayCurrTurn = 0;
            replayMaxTurn = data.length - 1;
            replayStatus = 'play';
            changeFrame = true;
            var slider = document.getElementById('replay-slider');
            slider.max = replayMaxTurn;
            slider.value = 0;
        }
        catch (exception) {
            alert("Wrong replay file!");
        }
    }
    fr.readAsArrayBuffer(file);
}

function play_loop() {
    if (replayStatus != 'invalid') {
        prevGameData = gameData;
        gameData = JSON.parse(JSON.stringify(fullGameData[replayCurrTurn]));
        if (replayStatus == 'play' && replayCurrTurn < replayMaxTurn) {
            replayCurrTurn += 1;
        }
        update_panels();
        parse_game_data_and_draw();
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

    play_loop();
})
