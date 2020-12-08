const qs = require('qs');
const request = require('./base');
const { departId, sportId } = require('../config/config.js');

module.exports.login = ({ phone, password }) => {
  return request.get('/user/login', {
    params: {
      phone,
      password,
    }
  });
};

// 获取预订时间列表
module.exports.getVenueDepartInfoInSevenDays = () => {
  return request.get('/venue/departInfoInSevenDays', {
    params: {
      departId,
      sportId,
    }
  });
}

// 获取场地列表
module.exports.getFieldList = (date) => {
  return request.get('/field/list', {
    params: {
      date,
      departId,
      sportId,
    },
  });
}

// 检查订单是否有效
module.exports.checkOrderLimit = ({
  fieldDetailIdsList,
  fieldDate,
}) => {
  return request.get('/order/check/orderLimit', {
    params: {
      fieldDetailIdsList,
      fieldDate,
    },
  });
}

// 订单确认信息
module.exports.confirmOrder = ({
  fielddate,
  fieldDetailIds,
  fieldStartTimes,
  fieldEndTimes,
  price,
}) => {
  return request.get('/order/confirm', {
    params: {
      venueid: departId,
      sportId,
      fielddate,
      fieldDetailIds,
      fieldStartTimes,
      fieldEndTimes,
      swimorder: '',
      price,
      ordertype: 2,
    },
  });
}

// 下单
module.exports.placeOrder = ({
  fieldorder
}) => {
  const data = {
    venueid: departId,
    sportid: sportId,
    ordertype: 2,
    fieldorder,
  }
  return request.post('/order/place', data, {
  });
};

module.exports.getOrderList = () => {
  const data = qs.stringify({
    status: 0,
    curPage: 1,
  });
  return request.post('/order/list', data, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    }
  });
};

module.exports.cancelOrder = (ordernum) => {
  const data = qs.stringify({
    ordernum,
  });
  return request.post('/order/cancel', data, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    }
  });
};
