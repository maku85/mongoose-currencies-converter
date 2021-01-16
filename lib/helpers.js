'use strict';

const fetch = require('node-fetch');
const moment = require('moment');

module.exports.fetchData = async (url) => {
  try {
    const response = await fetch(url);
    return response.json();
  } catch (err) {
    throw new Error(err);
  }
};

module.exports.checkDate = (date) => {
  const today = moment().startOf('day');

  if (!date) return today.format('YYYY-MM-DD');

  if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
    throw new Error(`Invalid Date: ${date}`);
  }

  return (today - moment(date) > 0 ? moment(date) : today).format('YYYY-MM-DD');
};

module.exports.checkCurrency = (value) => {
  if (!value) {
    throw new Error(`Invalid value. Currency is required!`);
  }

  if (typeof value !== 'string') {
    throw new Error(`Invalid value: ${value}. Currency must be a string!`);
  }

  if (value.replace(/\s+/g, '').length !== 3) {
    throw TypeError(`Invalid value: ${value}. Letter count not equal to 3!`);
  }

  return value.toUpperCase();
};
