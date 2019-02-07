restartGame = function(data) {
    $.ajax({
        url: "/restart",
        method: "POST",
        dataType: "json",
        contentType: 'application/json;charset=UTF-8',
        data: JSON.stringify({
            "test": 1
        }),
        success: function(msg) {
            console.log(msg);
        }
    })
}

$(function() {
    $('#restart-button').click(function() {
        console.log('click');
        restartGame({"test":1});
    })
})
