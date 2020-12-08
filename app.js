const storage = require('./storage');
const {
  login,
  getVenueDepartInfoInSevenDays,
  getFieldList,
  checkOrderLimit,
  confirmOrder,
  placeOrder,
  getOrderList,
  cancelOrder,
} = require('./api');
const userConfig = require('./config/config');
const { delay } = require('./utils');

function getAvailableFieldList(fieldList) {
  return fieldList.map(field => ({
    ...field,
    priceList: field.priceList.filter(item => item.status === '0'),
  }));
}

function getDisplayFieldList(fieldList) {
  return fieldList.reduce((total, cur) => {
    total[cur.fieldName] = cur.priceList.map(({ startTime, endTime }) => `${startTime}-${endTime}`).join(', ');
    return total;
  }, {});
}

function sortFieldList(fieldList = [], priorFields = []) {
  const targetList = [];
  priorFields.forEach(v => {
    const index = fieldList.findIndex(field => field.fieldName.includes(v));
    if (index > -1) {
      const field = fieldList.splice(index, 1)[0];
      targetList.push(field);
    }
  });
  fieldList.unshift(...targetList);
}

function getTimeRangeFields(timeRange, fieldList, fieldsNum = 1, priorFields = []) {
  const fields = [];
  const [totalStartTime, totalEndTime] = timeRange.split('-');
  fieldList = getAvailableFieldList(fieldList);
  sortFieldList(fieldList, priorFields);
  for (let field of fieldList) {
    const priceList = [];
    for (let price of field.priceList) {
      const {
        startTime,
        endTime,
      } = price;
      if (startTime >= totalStartTime && endTime <= totalEndTime) {
        priceList.push(price);
      }
    }
    // 检查是否满足连续时间范围
    let timeList = flatten(priceList.map(price => [price.startTime, price.endTime])).sort();
    timeList = timeList.filter(v => timeList.filter(vv => v === vv).length <= 1);
    if (timeList.length > 0 && totalStartTime === timeList[0] && totalEndTime === timeList[1]) {
      fields.push({
        ...field,
        priceList
      });
    }
    if (fields.length === fieldsNum) {
      return fields;
    }
  }
  return fields;
}

function flatten(arr) {
  return arr.reduce((flat, toFlatten) => {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

async function getToken() {
  // 登录获取token
  const {
    phone,
    password,
  } = userConfig;
  const { data } = await login({
    phone,
    password,
  });
  const { token } = data;
  storage.setItem('token', token);
}

async function getUnpaidOrderList() {
  const { data } = await getOrderList();
  if (!data.length) {
    console.log('订场失败');
    return;
  }
  console.log('待支付订单列表:')
  data.forEach(item => {
    console.log(`订单号: ${item.orderNum}`);
    console.log(`${item.title} ￥${item.cost}`);
    console.log(`剩余时间 ${item.remainTime}`);
  });
}

async function placeOrderAndRecord(params) {
  try {
    await placeOrder(params);
  } catch (e) {
    throw e;
  } finally {
    // 记录最后一次下单时间
    storage.setItem('lastOrderTime', new Date().getTime());
  }
}

function isApiError(e) {
  return e && e.headers && e.config;
}

function isLogoutError(e) {
  if (isApiError(e) && e.data && e.data.code === 906) {
    return true;
  }
  return false;
}

async function makeOrder(orderInfoItem) {
  try {
    const { date, timeRange, fieldsNum, priorFields = [] } = orderInfoItem;
    let res;

    // 获取场地列表
    res = await getFieldList(date);
    const availableFieldList = getAvailableFieldList(res.data[0].fieldList);
    console.log(`${date} 剩余场地：`);
    console.log(getDisplayFieldList(availableFieldList));
    console.log('\n');
    const availableFields = getTimeRangeFields(timeRange, availableFieldList, fieldsNum, priorFields);
    if (availableFields.length === 0) {
      console.log(`${date} ${timeRange} 已没有场地`);
      return;
    }
    console.log(`即将下单: ${availableFields.length}个场地\n`);
    availableFields.forEach(field => {
      console.log(`场地: ${field.fieldName}`)
      console.log(`日期: ${date}`)
      console.log(`时间: ${field.priceList.map(({ startTime, endTime }) => `${startTime}-${endTime}`).join(', ')}\n`);
    });

    const flattenPriceList = flatten(availableFields.map(field => field.priceList));

    // 检查订单是否有效（可省略）
    res = await checkOrderLimit({
      fieldDetailIdsList: flattenPriceList.map(price => price.id).join(','),
      fieldDate: date,
    });
    if (!res.data.canOrder) {
      console.log('检测订单无效\n');
      return;
    }

    // // 订单确认信息页面内容（可省略）
    // res = await confirmOrder({
    //   fielddate: date,
    //   fieldDetailIds: flattenPriceList.map(price => price.id).join(','),
    //   fieldStartTimes: flattenPriceList.map(price => price.startTime).join(','),
    //   fieldEndTimes: flattenPriceList.map(price => price.endTime).join(','),
    //   price: flattenPriceList.reduce((total, cur) => {
    //     total += (+cur.price);
    //     return total;
    //   }, 0).toFixed(2).toString(),
    // });

    // 下单
    const fieldorder = {
      date,
      fieldlist: []
    };
    availableFields.forEach(field => {
      field.priceList.forEach(price => {
        fieldorder.fieldlist.push({
          id: '' + field.id,
          stime: price.startTime,
          etime: price.endTime,
          priceidlist: ['' + price.id]
        })
      });
    });
    // 间隔10秒才能下单
    const lastOrderTime = storage.getItem('lastOrderTime') || 0;
    const leftTime = 10000 - (new Date().getTime() - lastOrderTime);
    if (leftTime >= 0) {
      console.log(`距离上次下单不足10秒，剩余时间：${leftTime}ms。等待中`)
      await delay(leftTime);
    }
    await placeOrderAndRecord({ fieldorder });
    console.log(`${date}下单成功，请手动进APP支付`);
  } catch (e) {
    throw e;
  }
}

async function startTask() {
  try {
    const { orderInfo = [] } = userConfig;
    console.log(`期望预订场地:`);
    orderInfo.forEach(order => {
      console.log(`${order.date} ${order.timeRange}, 数量: ${order.fieldsNum}`);
    });

    // 预定时间列表（如果可省略）
    // const res = await getVenueDepartInfoInSevenDays();
    // const hasLeftDate = res.data.filter(v => v.left > 0).map(v => v.date);

    // if (hasLeftDate.length === 0) {
    //  console.log('本周已无空场');
    //  return;
    // }

    // await Promise.all(orderInfo.map(orderInfoItem => {
    //   return new Promise(async (resolve, reject) => {
    //     try {
    //       await makeOrder(orderInfoItem);
    //       resolve();
    //     } catch (e) {
    //       if (isLogoutError(e)) {
    //         return reject(e);
    //       }
    //       if (isApiError(e)) {
    //         console.log(`请求接口 ${e.config.url} 出错`);
    //         console.log(e.data);
    //       }
    //       resolve();
    //     }
    //   })
    // }));

    for (const orderInfoItem of orderInfo) {
      try {
        await makeOrder(orderInfoItem);
      } catch (e) {
        if (isLogoutError(e)) {
          throw e;
        }
        if (isApiError(e)) {
          console.log(`请求接口 ${e.config.url} 出错`);
          console.log(e.data);
        } else {
          throw e;
        }
      }
    }

    await getUnpaidOrderList();

  } catch (e) {
    throw e;
  }
}

(async function run() {
  try {
    if (!storage.getItem('token')) {
      console.log('登录中')
      await getToken();
    }
    await startTask();
  } catch (e) {
    if (isApiError(e)) {
      // api error
      console.log(`请求接口 ${e.config.url} 出错`);
      console.log(e.data);
      console.log('\n');
      if (isLogoutError(e)) {
        console.log('重新登录中...')
        await getToken();
        run();
      }
    } else {
      // other error
      console.log(e);
    }
  }
})();
