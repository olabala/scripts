const { DepartIds, SportIds } = require('../constants');

module.exports = {
  phone: '',
  password: '',
  departId: DepartIds['NAN_SHAN'], // NAN_SHAN / DA_YUN
  sportId: SportIds['BADMINTON'],
  orderInfo: [{
    timeRange: '20:00-22:00',
    date: '2020-11-25',
    fieldsNum: 2, // 需要的场地数量，每天最多4小时
    priorFields: ['11', '12', '13', '14', '06', '07'],
  }]
  // 因为无法支付，所以目前只能订一天
};
