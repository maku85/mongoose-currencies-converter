'use strict';

const get = require('lodash.get');
const Promise = require('bluebird');
const set = require('lodash.set');
const { Schema } = require('mongoose');

const currencyService = require('./currencyService');

const convertCurrencies = async ({
  doc,
  fields,
  defaultToCurrency,
  numberOfDigit,
  force = false,
}) =>
  Promise.map(fields, async (field) => {
    const isFieldModified =
      doc.isModified &&
      (doc.isModified(field.name) || doc.isModified(field.currency));
    const hasValue = get(doc, field.name) >= 0;
    if ((force || isFieldModified) && hasValue) {
      let conversion;
      try {
        conversion = await currencyService.convertCurrency({
          from: get(doc, field.currency),
          to: defaultToCurrency,
          amount: get(doc, field.name),
          date: get(doc, field.date),
          digit: numberOfDigit,
        });
      } finally {
        set(doc, `${field.name}Conversion`, conversion);
      }
    }

    return doc;
  });

const checkField = ({ name, currency }, schema) => {
  if (!name) throw new Error('field name is required');

  if (typeof name !== 'string') {
    throw new Error(`field name must be a string, received ${typeof name}`);
  }

  if (!get(schema, `obj.${name}`)) {
    throw new Error('field not exists in schema');
  }

  if (currency && typeof currency !== 'string') {
    throw new Error(
      `field currency name must be a string, received ${typeof currency}`,
    );
  }

  if (!get(schema, `obj.${currency}`)) {
    throw new Error('currency field not exists in schema');
  }
};

const plugin = (schema, pluginOpts) => {
  const options = pluginOpts || {};

  const {
    convertAutomatically = plugin.defaults.convertAutomatically,
    defaultToCurrency = plugin.defaults.defaultToCurrency,
    fields,
    numberOfDigit = plugin.defaults.numberOfDigit,
  } = options;

  if (!fields || !fields.length) throw new Error('option fields must be set');

  // add nested schema for each field
  fields.forEach((field) => {
    checkField(field, schema);

    schema.add({
      [`${field.name}Conversion`]: new Schema(
        {
          currency: String,
          date: Date,
          value: Number,
        },
        { _id: false },
      ),
    });
  });

  /**
   * Update manually currency fields
   * @param options - (optional) specify fields to convert
   * @param cb - callback when conversion is complete
   */
  async function manualConversion(inOpts, inCb) {
    const opts = inOpts || {};
    const cb = inCb;

    const filteredFields = opts.fields
      ? fields.filter((field) => opts.fields.includes(field.name))
      : fields;

    await convertCurrencies({
      doc: this,
      fields: filteredFields,
      defaultToCurrency,
      numberOfDigit,
      force: true,
    });

    return this.save().then(cb);
  }

  // add manualConversion as method on documents
  schema.method('convert', manualConversion);

  /**
   * Use standard Mongoose Middleware hooks
   */
  function setUpMiddlewareHooks(inSchema) {
    /**
     * Convert currency fields before save.
     */
    inSchema.pre('save', function () {
      return convertCurrencies({
        doc: this,
        fields,
        defaultToCurrency,
        numberOfDigit,
      });
    });

    /**
     * Convert currency fields before multiple docs insert.
     */
    inSchema.pre('insertMany', (_next, docs) =>
      Promise.each(docs, (doc) =>
        convertCurrencies({
          doc,
          fields,
          defaultToCurrency,
          numberOfDigit,
          force: true,
        }),
      ),
    );
  }

  if (convertAutomatically) {
    setUpMiddlewareHooks(schema);
  }
};

plugin.defaults = {
  convertAutomatically: true,
  defaultToCurrency: 'EUR',
  numberOfDigit: 2,
};

module.exports = plugin;
