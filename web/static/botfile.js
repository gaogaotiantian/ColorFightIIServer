var storage = firebase.storage();

function set_link() {
    var python3_ref = storage.ref('assets/python3.zip');
    var java_ref = storage.ref('assets/java.zip');

    python3_ref.getDownloadURL().then(function(url) {
        $('#python3-download').attr("href", url);
    })

    java_ref.getDownloadURL().then(function(url) {
        $('#java-download').attr("href", url);
    })
}

$(function() {
    set_link();
})
