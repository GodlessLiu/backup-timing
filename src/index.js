const axios = require("axios");
const corn = require("node-cron");
const dayjs = require("dayjs");

require("dotenv").config();
const URL = process.env.BASE_URL + "/apis/migration.halo.run/v1alpha1/backups";
const CHECKURL =
  process.env.BASE_URL +
  "/apis/migration.halo.run/v1alpha1/backups?sort=metadata.creationTimestamp%2Cdesc";

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

async function checkBackup(success_on_save, failed_on_save) {
  const { data } = await axios.get(CHECKURL, {
    headers: {
      Authorization: "Bearer " + process.env.TOKEN,
    },
  });
  const successList = data.items.filter(
    (item) => item.status.phase === "SUCCEEDED"
  );
  const failList = data.items.filter((item) => item.status.phase === "FAILED");
  if (
    successList.length >= success_on_save ||
    failList.length >= failed_on_save
  ) {
    return [...successList.slice(4), ...failList.slice(4)];
  }
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
  const deleteArray = await checkBackup(
    config.success_on_save,
    config.failed_on_save
  );
  const payload = generatePayload(config.expire);
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

corn.schedule("*/10 * * * * *", () => {
  const config = require("../setting.json");
  main(config);
});
