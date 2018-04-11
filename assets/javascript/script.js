
// Initialize Firebase
var config = {
    apiKey: "AIzaSyDXYJzsjICq8pyExrYzjk_3eFatp-nQnJc",
    authDomain: "trainscheduler-7820e.firebaseapp.com",
    databaseURL: "https://trainscheduler-7820e.firebaseio.com",
    projectId: "trainscheduler-7820e",
    storageBucket: "",
    messagingSenderId: "475691001952"
};
firebase.initializeApp(config);

var provider = new firebase.auth.GoogleAuthProvider();
firebase.auth().signInWithRedirect(provider);
firebase.auth().getRedirectResult().then(function(result) {
    if (result.credential) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = result.credential.accessToken;
      // ...
    }
    // The signed-in user info.
    var user = result.user;
  }).catch(function(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    // The email of the user's account used.
    var email = error.email;
    // The firebase.auth.AuthCredential type that was used.
    var credential = error.credential;
    // ...
  });

var name, dest, firstTrainTime, frequency, currentTime, snapshotGlobal, database = firebase.database();

function clearFields() {
    $("#time-warning").text("");
    $("#freq-warning").text("");
    $("#train-name").val('');
    $("#destination").val('');
    $("#first-train-time").val('');
    $("#frequency").val('');
}

$("#submit").on("click", function () {
    name = $("#train-name").val().trim();
    dest = $("#destination").val().trim();
    firstTrainTime = $("#first-train-time").val().trim();
    frequency = $("#frequency").val().trim();
    if (!/^([0-1]?[0-9]|[2][0-3]):([0-5][0-9])(:[0-5][0-9])?$/.test(firstTrainTime)) {
        $("#time-warning").text(" (You must enter a valid time)");
    } else if (!/^\d{1,}$/.test(frequency)) {
        $("#freq-warning").text(" (You must enter a valid number)");
    } else {
        clearFields();
        database.ref().push({
            name: name,
            dest: dest,
            firstTrainTime: firstTrainTime,
            frequency: frequency,
            dateAdded: firebase.database.ServerValue.TIMESTAMP

        });
    }
});

$("#clear_fields").on("click", function () {
    clearFields();
});


function displayTrains(sv, key) {
    var firstTrain = sv.firstTrainTime, freq = sv.frequency, startTime, nextArrival, nextTrain, nextTrainHour, nextTrainMinute, amOrPm, minutesAway;

    currentTime = moment();
    if (firstTrain.length == 4) {
        firstTrain = "0" + firstTrain;
    }
    startTime = moment().hour(firstTrain.slice(0, 2)).minute(firstTrain.slice(3));
    var minuteDiff = parseInt(currentTime.diff(startTime, "minutes"));
    console.log(minuteDiff);
    nextArrival = startTime;
    if (minuteDiff > 0) {
        while (freq > 1440) {
            freq -= 1440;
            minuteDiff -= 1440;
        }
    }
    while (currentTime.diff(nextArrival, "minutes") >= 0) {
        nextArrival.add(freq, "minutes");
        minuteDiff -= freq;
        //console.log(freq);
    }
    minutesAway = Math.abs(minuteDiff);
    console.log("next arrival:", nextArrival, "current Time:", currentTime, "minutediff:", minuteDiff);
    //sets the time for the next train
    if (nextArrival.hour() > 12) {
        amOrPm = " PM";
        nextTrainHour = nextArrival.hour() - 12;
    } else if (nextArrival.hour() == 12) {
        amOrPm = " PM";
        nextTrainHour = nextArrival.hour();
    } else {
        amOrPm = " AM";
        nextTrainHour = nextArrival.hour();
    }
    if (nextArrival.minute() < 10) {
        nextTrainMinute = "0" + nextArrival.minute();
    } else {
        nextTrainMinute = nextArrival.minute();
    }
    nextTrain = nextTrainHour + ":" + nextTrainMinute + amOrPm;
    /*database.ref(key).update({
        nextTrain: nextTrain
    })*/
    var newRow = $("<tr id='" + key + "'>");
    newRow.append("<td>" + sv.name + "</td>").append("<td>" + sv.dest + "</td>")
        .append("<td>" + sv.frequency + "</td>").append("<td>" + nextTrain + "</td>");

    if (minutesAway == 1) {
        newRow.append("<td class='text-danger'>Arriving Now</td>");
    } else {
        newRow.append("<td>" + minutesAway + "</td>");
    }
    newRow.append("<td><button type='button' class='update btn btn-primary' data-toggle='modal' data-target='#updateModal' data-key='" + key + "'>Update</button></td>")
        .append("<td><button class='remove btn btn-danger' data-key='" + key + "'>Remove</button></td>");
    $("tbody").append(newRow);
}

function intervalDisplay() {
    $("tbody").empty();
    for (const key in snapshotGlobal) {
        const sv = snapshotGlobal[key];
        displayTrains(sv, key);

    }
}

database.ref().orderByChild("dateAdded").on("value", function (snapshot) {
    $("tbody").empty();
    snapshotGlobal = snapshot.val();
    for (const key in snapshotGlobal) {
        const sv = snapshotGlobal[key];
        displayTrains(sv, key);

    }

});

var intervalId = setInterval(intervalDisplay, 1000 * 60);

//removes the train from the database
$("tbody").on("click", ".remove", function () {
    for (const key in snapshotGlobal) {
        if (key == $(this).attr("data-key")) {
            database.ref(key).remove();
        }
    }
});

$("tbody").on("click", ".update", function () {
    var rowId = $(this).attr("data-key"), train = $("#" + rowId + " :nth-child(4)").text(), hour, military, aOrP;
    $("#m-train-name").val(snapshotGlobal[rowId].name);
    $("#m-destination").val(snapshotGlobal[rowId].dest);

    if (train.length == 7) {
        train = "0" + train;
    }
    aOrP = train.slice(6, 7);;
    if (aOrP == 'P') {
        military = (parseInt(train.slice(0, 2)) + 12) + ":" + train.slice(3, 5);
    } else if (aOrP == 'A') {
        military = train.slice(0, 2) + ":" + train.slice(3, 5);
    }
    $("#m-next-train").val(military);
    $("#m-frequency").val(snapshotGlobal[rowId].frequency);
    $("#update-data").attr("data-key", rowId);
})

$("#update-data").on("click", function () {
    name = $("#m-train-name").val().trim();
    dest = $("#m-destination").val().trim();
    firstTrainTime = $("#m-next-train").val().trim();
    frequency = $("#m-frequency").val().trim();
    if (!/^([0-1]?[0-9]|[2][0-3]):([0-5][0-9])(:[0-5][0-9])?$/.test(firstTrainTime)) {
        $("#m-time-warning").text(" (You must enter a valid time)");
    } else if (!/^\d{1,}$/.test(frequency)) {
        $("#m-freq-warning").text(" (You must enter a valid number)");
    } else {
        $("#m-time-warning").text("");
        $("#m-freq-warning").text("");
        $("#m-train-name").val('');
        $("#m-destination").val('');
        $("#m-next-train").val('');
        $("#m-frequency").val('');
        database.ref($(this).attr("data-key")).update({
            name: name,
            dest: dest,
            firstTrainTime: firstTrainTime,
            frequency: frequency,
            dateAdded: firebase.database.ServerValue.TIMESTAMP
        });
    }
});