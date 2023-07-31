"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Store extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Store.hasOne(models.QuickAction, { foreignKey: "StoreId" });
      Store.hasOne(models.SMSHelper, { foreignKey: "StoreId" });
    }
  }
  Store.init(
    {
      name: DataTypes.STRING,
      access_token: DataTypes.TEXT,
      api_key: DataTypes.TEXT,
      secret_key: DataTypes.TEXT,
      shop_name: DataTypes.STRING,
      logo: DataTypes.TEXT,
      currency: DataTypes.STRING,
      GA_TrackingId: DataTypes.STRING,
      location: DataTypes.STRING,
      store_layout: DataTypes.STRING,
      more_info: DataTypes.TEXT,
      archive: DataTypes.BOOLEAN,
      active: DataTypes.BOOLEAN,
      draft: DataTypes.BOOLEAN,
      country_code: DataTypes.STRING,
      phone_number: DataTypes.STRING,
      sale: DataTypes.BOOLEAN,
      arrival: DataTypes.BOOLEAN,
      vendor: DataTypes.BOOLEAN,
      price: DataTypes.BOOLEAN,
      platform: DataTypes.STRING,
      publishedAt: DataTypes.BOOLEAN,
      username_ariadne: DataTypes.STRING,
      password_ariadne: DataTypes.STRING,
      product_id_ariadne: DataTypes.INTEGER,
      properties_analytics: DataTypes.STRING,
      latitude: DataTypes.DOUBLE,
      longitude: DataTypes.DOUBLE,
      checkMinutes: DataTypes.INTEGER,
      qr_scanner_w: DataTypes.INTEGER,
      qr_scanner_h: DataTypes.INTEGER,
      bar_scanner_w: DataTypes.INTEGER,
      bar_scanner_h: DataTypes.INTEGER,
      wording_qr_scan: DataTypes.TEXT,
      wording_bar_scan: DataTypes.TEXT,
      scanner: DataTypes.STRING,
      address: DataTypes.TEXT,
      storeContact: DataTypes.STRING,
      timezone: DataTypes.STRING,
      main_store: DataTypes.STRING,
      GA_TrackingId_dashboard: DataTypes.STRING,
      GA_TrackingId_insight: DataTypes.STRING,
      gmtOffset: DataTypes.STRING,
      store_country: DataTypes.STRING,
      store_state: DataTypes.STRING,
      store_code: DataTypes.STRING,
      formatted_store_id: DataTypes.STRING,
      store_order: DataTypes.STRING,
      store_region: DataTypes.STRING,
      store_mall_name: DataTypes.STRING,
      operational_hour: DataTypes.TEXT,
      size_sqm: DataTypes.INTEGER,
      completion: DataTypes.STRING,
      // status_ariadne: DataTypes.BOOLEAN,
      // start_date_ariadne: DataTypes.STRING,
      isEngage: DataTypes.BOOLEAN,
      isTraffic: DataTypes.BOOLEAN,
      isInsights: DataTypes.BOOLEAN,
      isApproval: DataTypes.BOOLEAN,
      isActive: DataTypes.BOOLEAN,
      contact_email: DataTypes.STRING,
      isReviewed: DataTypes.BOOLEAN,
      isRejected: DataTypes.BOOLEAN,
      reason_rejected: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "Store",
    }
  );
  return Store;
};
