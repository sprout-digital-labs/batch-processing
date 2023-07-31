require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT;
const cors = require("cors");
const cron = require("node-cron");
const scheduleSyncProductStoreToDatabase = require("./service/SyncProduct");

const moment = require("moment-timezone");
moment.tz.setDefault("Asia/Kuala_Lumpur");

// Initalize Sentry (import library and instantiate)

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

console.log(
  `Server running in ${process.env.NODE_ENV} environment on port ${port}.🚀`
);
console.log(
  "Sets timezone to Asia/Jakarta",
  ":",
  moment(new Date()).format("YYYY-MM-DD HH:mm")
);

cron.schedule("* * * * *", async function () {
  scheduleSyncProductStoreToDatabase();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
