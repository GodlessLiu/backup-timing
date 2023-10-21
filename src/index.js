const axios = require("axios");
const corn = require("node-cron");
const dayjs = require("dayjs");

require("dotenv").config();
const URL = process.env.BASE_URL + "/apis/migration.halo.run/v1alpha1/backups";
const CHECKURL =
  process.env.BASE_URL +
  "/apis/migration.halo.run/v1alpha1/backups?sort=metadata.creationTimestamp%2Cdesc";
const MAX_LENGTH = 5;

function generatePayload(expire) {
  return {
    apiVersion: "migration.halo.run/v1alpha1",
    kind: "Backup",
    metadata: {
      generateName: "backup-",
      name: "",
    },
    spec: {
      expiresAt: dayjs().add(expire.num, expire.unit).toISOString(),
    },
  };
}

async function checkBackup() {
  const { data } = await axios.get(CHECKURL, {
    headers: {
      Authorization: "Bearer " + process.env.TOKEN,
    },
  });
  const total = data.total;
  if (total >= MAX_LENGTH) return data.items.slice(4);
  return [];
}
async function fetchBackup(payload) {
  const { data } = await axios.post(URL, payload, {
    headers: {
      Authorization: "Bearer " + process.env.TOKEN,
    },
  });
  return data;
}

async function main(config) {
  const deleteArray = await checkBackup();
  const payload = generatePayload();
  if (deleteArray.length) {
    deleteArray.forEach(async (item) => {
      await axios.delete(URL + "/" + item.metadata.name, {
        headers: {
          Authorization: "Bearer " + process.env.TOKEN,
        },
      });
    });
    await fetchBackup(payload);
    console.log("backup success");
    return;
  }
  await fetchBackup(payload);
  console.log("backup success");
}

corn.schedule("30 0 * * *", () => {
  const config = require("../setting.json");
  main(config);
});
