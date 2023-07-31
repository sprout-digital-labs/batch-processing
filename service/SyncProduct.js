// require("dotenv").config();

const { Store, sequelize,  } = require("../../models");

const AWS = require("aws-sdk");

let moment = require("moment-timezone");
moment.tz.setDefault("Asia/Kuala_Lumpur");


AWS.config.update({
  accessKeyId: "ACCESS_KEY",
  secretAccessKey: "SECRET KEY",
  region: "REGION",
});

const s3 = new AWS.S3();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const groupBy = (arr, key) => {
  const penampung = {};

  arr.forEach((element) => {
    const identifier = element[key];

    if (penampung[identifier] == null) {
      penampung[identifier] = [];
    }

    penampung[identifier].push(element);
  });

  return penampung;
};

// Get buffered file from s3
function getBufferFromS3(file, callback) {
  const buffers = [];
  const stream = s3
    .getObject({ Bucket: "new-store-data", Key: file })
    .createReadStream();
  stream.on("data", (data) => buffers.push(data));
  stream.on("end", () => callback(null, Buffer.concat(buffers)));
  stream.on("error", (error) => callback(error));
}

function getBufferFromS3Promise(file) {
  return new Promise((resolve, reject) => {
    getBufferFromS3(file, (error, s3buffer) => {
      if (error) return reject(error);
      return resolve(s3buffer);
    });
  });
}

const getResult = async (fileName) => {
  console.log(
    `CRON SYNCPRODUCTSTORE: ⏰ ${moment().format(
      "HH:mm:ss"
    )} Start Download ${fileName}`
  );
  const buffer = await getBufferFromS3Promise(fileName);

  const excelToJson = require("convert-excel-to-json");

  console.log(
    `CRON SYNCPRODUCTSTORE: ⏰ ${moment().format(
      "HH:mm:ss"
    )} Start Export To JSON...`
  );
  const result = excelToJson({
    source: buffer,
  });

  // console.log(`CRON SYNCPRODUCTSTORE: ⏰ ${moment().format('HH:mm:ss')} Finish Export To Json...`)
  return result;
};

async function scheduleSyncProductStoreToDatabase() {
  try {
    let storeIds = await Store.findAll({
      where: { platform: "store" },
    });

    storeIds = storeIds.map((e) => {
      const obj = {
        obj: e.store_code,
        store_id: e.id,
      };
      return obj;
    });

    // Download and Convert to JSON
    console.log(
      `CRON SYNCPRODUCTSTORE: ⏰ ${moment().format("HH:mm:ss")} Start Cron...`
    );

    for (let idx_file = 1; idx_file <= 6; idx_file++) {
      const fileName = `File ${idx_file}.xlsx`;
      let masterData = await getResult(fileName);

      const sheet = Object.keys(masterData);

      console.log(
        `CRON SYNCPRODUCTSTORE: ⏰ ${moment().format(
          "HH:mm:ss"
        )} Processing Data...`
      );

      for (let x = 0; x < sheet.length; x++) {
        console.log(
          `CRON SYNCPRODUCTSTORE: ⏰ ${moment().format(
            "HH:mm:ss"
          )} Start Schedule Update Sync store ${sheet[x]} on Database`
        );
        // Get only AMB
        // console.log(`CRON SYNCPRODUCTSTORE: ⏰ ${moment().format('HH:mm:ss')} Get ${sheet[x]}'s data...`)
        let data = masterData[sheet[x]];

        // Define Product Id
        // console.log(`CRON SYNCPRODUCTSTORE: ⏰ ${moment().format('HH:mm:ss')} Start mapping product_id for every datas...`)
        data = data.map((e) => {
          if (e.C.includes(" ")) e.product_id = e.C.replace(" ", "_");
          else e.product_id = e.C;

          return e;
        });

        data = data.filter((e) => e.product_id !== "SKU");

        // console.log(`CRON SYNCPRODUCTSTORE: ⏰ ${moment().format('HH:mm:ss')} End mapping product_id for every datas...`)

        const findStoreId = storeIds.find((e) => e.obj === sheet[x]);

        const StoreId = findStoreId ? findStoreId.store_id : null;

        if (StoreId) {
          // Groupping By Product Id
          // console.log(`CRON SYNCPRODUCTSTORE: ⏰ ${moment().format('HH:mm:ss')} Start grouping data by product_id ...`)
          const groupProductId = groupBy(data, "product_id");

          // Format Data and Get Query
          // console.log(`CRON SYNCPRODUCTSTORE: ⏰ ${moment().format('HH:mm:ss')} Start looping data by product_id ...`)

          let count = 0;
          let arrQuery = [];

          for (let key in groupProductId) {
            count++;
            const res = groupProductId[key][0];

            const obj = {
              StoreId: StoreId,
              product_id: key,
              title: res.F,
              description: null,
              vendor: res.E,
              product_type: res.I,
              price: Number.parseFloat(res.K).toFixed(1),
              discount_price: Number.parseFloat(res.L).toFixed(1),
              handle: null,
              tags: null,
              status: "active",
              variants_obj: null,
              images_obj: null,
              images: null,
              store_created_at: null,
              store_updated_at: null,
              searchText: null,
              promoImgUrl: null,
              options_obj: null,
              additional_data: null,
              arrival: false,
              sale: true,
              SKUERP: res.B,
              product_store_id: `${key}_${StoreId}`,
              createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
              updatedAt: moment().format("YYYY-MM-DD HH:mm:ss"),
              division: res.H,
            };

            const arr_var = [];
            const arr_opt = [
              {
                id: 1,
                product_id: obj.product_id,
                name: "Size",
                position: 1,
                values: [],
              },
            ];
            // variants_obj
            for (let k = 0; k < groupProductId[key].length; k++) {
              const res_var = groupProductId[key][k];

              let obj_var = {
                id: res_var.N,
                product_id: obj.product_id,
                title: res_var.M,
                option1: res_var.M,
                position: 1,
                inventory_quantity: res_var.O,
                inventory_policy: "deny",
                price: obj.discount_price,
                compare_at_price: res_var.K === res_var.L ? null : obj.price,
              };
              arr_var.push(obj_var);

              // options_obj
              arr_opt[0].values.push(res_var.M);
              const uniqueOpt = [...new Set(arr_opt[0].values)];
              arr_opt[0].values = uniqueOpt;
            }
            obj.variants_obj = JSON.stringify(arr_var);
            obj.options_obj = JSON.stringify(arr_opt);

            if (obj.discount_price !== null && obj.discount_price < obj.price) {
              obj.sale = true;
            } else {
              obj.sale = false;
            }

            // images_obj
            obj.images_obj = JSON.stringify([]);
            obj.images = JSON.stringify([]);

            const variantNames = JSON.parse(obj.variants_obj)
              .map((e) => e.title)
              .join(", ");
            const variantIds = JSON.parse(obj.variants_obj)
              .map((e) => e.id)
              .join(", ");

            obj.searchText =
              obj.product_id +
              "," +
              obj.title +
              "," +
              obj.vendor +
              "," +
              obj.product_type +
              variantNames +
              variantIds;

            // additional_data
            obj.additional_data = JSON.stringify([
              {
                title: "gender",
                value: res.G,
              },
              {
                title: "division",
                value: res.H,
              },
              {
                title: "subCategory",
                value: res.J,
              },
            ]);

            if (obj.title) {
              if (obj.title.includes(`'`))
                obj.title = obj.title.replaceAll(`'`, `\\'`);
              if (obj.vendor.includes(`'`))
                obj.vendor = obj.vendor.replaceAll(`'`, `\\'`);
              if (obj.product_type.includes(`'`))
                obj.product_type = obj.product_type.replaceAll(`'`, `\\'`);
              if (obj.variants_obj.includes(`'`))
                obj.variants_obj = obj.variants_obj.replaceAll(`'`, `\\'`);
              if (obj.options_obj.includes(`'`))
                obj.options_obj = obj.options_obj.replaceAll(`'`, `\\'`);
              if (obj.images_obj.includes(`'`))
                obj.images_obj = obj.images_obj.replaceAll(`'`, `\\'`);
              if (obj.images.includes(`'`))
                obj.images = obj.images.replaceAll(`'`, `\\'`);
              if (obj.searchText.includes(`'`))
                obj.searchText = obj.searchText.replaceAll(`'`, `\\'`);
              if (obj.additional_data.includes(`'`))
                obj.additional_data = obj.additional_data.replaceAll(
                  `'`,
                  `\\'`
                );

              let query = `(${obj.StoreId}, '${obj.product_id}', '${obj.title}', '${obj.vendor}', '${obj.product_type}', ${obj.price}, ${obj.discount_price}, '${obj.variants_obj}', '${obj.options_obj}','${obj.images_obj}', '${obj.images}', '${obj.searchText}', '${obj.additional_data}', '${obj.SKUERP}', '${obj.product_store_id}', '${obj.status}', '${obj.createdAt}', '${obj.updatedAt}', ${obj.sale}, ${obj.arrival}, '${obj.division}' )`;
              arrQuery.push(query);

              // console.log(`CRON SYNCPRODUCTSTORE: ⏰ ${moment().format('HH:mm:ss')} Processing product ${count} with total data ${Object.keys(groupProductId).length}...`)
            }
          }

          // Groupping Query per-5000 values
          // console.log(`CRON SYNCPRODUCTSTORE: ⏰ ${moment().format('HH:mm:ss')} Groupping Query per-5000 values and Upsert To Database...`)
          let arr = [];
          for (let i = 0; i < arrQuery.length; i++) {
            if (i % 500 === 0 && i !== 0) {
              let join =
                `INSERT INTO ProductStores (StoreId, product_id, title, vendor, product_type, price, discount_price, variants_obj, options_obj, images_obj, images, searchText, additional_data, SKUERP, product_store_id, status, createdAt, updatedAt, sale, arrival, division) VALUES ` +
                arr.join(", ") +
                ` ON DUPLICATE KEY UPDATE StoreId = VALUES (StoreId), product_id = VALUES (product_id), title = VALUES (title), vendor = VALUES (vendor), product_type = VALUES (product_type), price = VALUES (price), discount_price = VALUES (discount_price), variants_obj = VALUES (variants_obj), options_obj = VALUES (options_obj), images_obj = VALUES (images_obj), images = VALUES (images), searchText = VALUES (searchText), additional_data = VALUES (additional_data), SKUERP = VALUES (SKUERP), product_store_id = VALUES (product_store_id), status = VALUES (status), createdAt = VALUES (createdAt), updatedAt = VALUES (updatedAt), sale = VALUES (sale), arrival = VALUES (arrival), division = VALUES (division);`;

              await sequelize.query(join);

              arr = [];
              await sleep(500);
            }
            arr.push(arrQuery[i]);
          }

          let join =
            `INSERT INTO ProductStores (StoreId, product_id, title, vendor, product_type≈, price, discount_price, variants_obj, options_obj, images_obj, images, searchText, additional_data, SKUERP, product_store_id, status, createdAt, updatedAt, sale, arrival, division) VALUES ` +
            arr.join(", ") +
            ` ON DUPLICATE KEY UPDATE StoreId = VALUES (StoreId), product_id = VALUES (product_id), title = VALUES (title), vendor = VALUES (vendor), product_type = VALUES (product_type), price = VALUES (price), discount_price = VALUES (discount_price), variants_obj = VALUES (variants_obj), options_obj = VALUES (options_obj), images_obj = VALUES (images_obj), images = VALUES (images), searchText = VALUES (searchText), additional_data = VALUES (additional_data), SKUERP = VALUES (SKUERP), product_store_id = VALUES (product_store_id), status = VALUES (status), createdAt = VALUES (createdAt), updatedAt = VALUES (updatedAt), sale = VALUES (sale), arrival = VALUES (arrival), division = VALUES (division);`;
          await sequelize.query(join);

          await sleep(500);
        }

        // Done
        // console.log(`CRON SYNCPRODUCTSTORE: ⏰ ${moment().format('HH:mm:ss')} Finish Update ${sheet[x]}`)
      }
    }

    console.log(
      `CRON SYNCPRODUCTSTORE: ⏰ ${moment().format("HH:mm:ss")} Finish Cron`
    );

    return "Finish Schedule Update Sync store on Database";
  } catch (err) {
    console.log({
      time: `⏰ ${moment().format("HH:mm:ss")}`,
      message: "Error Schedule Update Sync store on Database",
      err,
      keys: Object.keys(err),
    });

    // Define Error Message
    const errMessage =
      err.name === "SequelizeDatabaseError"
        ? `${err.name}: ${err.parent}`
        : err.stack.split("\n")[0];

    return err.stack.split("\n")[0];
  }
}

module.exports = scheduleSyncProductStoreToDatabase;
