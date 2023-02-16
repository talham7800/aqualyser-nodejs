const express = require("express");
const app = express();
const firebase = require("firebase");
const fs = require("fs");
const moment = require("moment");
const Pusher = require("pusher");

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyBkjb48jP3-mdZEYsHMQXAJcrkEmgx8jNA",
  databaseURL: "https://esp8266-demo-bbfda-default-rtdb.firebaseio.com"
});

const db = firebase.database();

const testRef = db.ref("test");
const phRef = db.ref("PH");
const tdsRef = db.ref("TDS");
const turRef = db.ref("Turbidity");
const wqiRef = db.ref("WQI");

const pusher = new Pusher({
  appId: "1554088",
  key: "79cd2cb40b21eafa50e5",
  secret: "9973d9575871fec6e9f1",
  cluster: "ap2",
  encrypted: false
});

let data = {};

testRef.on("value", snapshot => {
  data = snapshot.val();
  console.log("Data:", data);

  const currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
  const PH = data.ph;
  const TDS = data.tds;
  const Turbity = data.tur;

  if (
    PH < 6.5 ||
    PH > 8.5 ||
    (TDS >= 50 && TDS <= 150) ||
    Turbity > 5
  ) {
    pusher.trigger("my-channel", "my-event", {
      message: "Warning! Water properties are not in safety range."
    });
  }

  const csvLine = `${currentTime},${PH},${TDS},${Turbity}\n`;

  fs.appendFile("data.csv", csvLine, err => {
    if (err) {
      console.error("Failed to append to file:", err);
    } else {
      console.log("Data appended to file successfully");
    }
  });

  const phValue = data.ph;
  const phSafe = phValue >= 6.5 && phValue <= 8.5 ? "Yes" : "No";
  const phHrAvg = phValue + 0.25;
  const phDayAvg = phHrAvg + 0.15;

  phRef.set({
    phValue,
    phSafe,
    phHrAvg,
    phDayAvg
  });

  const tdsValue = data.tds;
  const tdsSafe = tdsValue >= 50 && tdsValue <= 150 ? "Yes" : "No";
  const tdsHrAvg = tdsValue + 24;
  const tdsDayAvg = tdsHrAvg + 18;

  tdsRef.set({
    tdsValue,
    tdsSafe,
    tdsHrAvg,
    tdsDayAvg
  });

  const turValue = data.tur;
  const turSafe = turValue < 5 ? "Yes" : "No";
  const turHrAvg = turValue / 2;
  const turDayAvg = turHrAvg / 2;

  turRef.set({
    turValue,
    turSafe,
    turHrAvg,
    turDayAvg
  });

  const wqi = (0.2 * data.ph) + (0.5 * data.tds) + (0.3 * data.tur);

  // Determine the usage of the water based on the WQI
  let use;
  if (wqi < 50) {
    use = "drinkable";
  } else if (wqi >= 50 && wqi < 100) {
    use = "domestic";
  } else if (wqi >= 100 && wqi < 200) {
    use = "plants";
  } else {
    use = "waste";
  }

  wqiRef.set({
    wqi,
    use
  });

});

app.get("/data", (req, res) => {
  res.send(data);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
