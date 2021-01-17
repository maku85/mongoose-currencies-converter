# Mongoose currencies converter [WIP]

![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/maku85/mongoose-currencies-converter.svg)
[![CircleCI](https://circleci.com/gh/maku85/mongoose-currencies-converter.svg?style=shield)](https://circleci.com/gh/maku85/mongoose-currencies-converter)
[![Coverage Status](https://coveralls.io/repos/github/maku85/mongoose-currencies-converter/badge.svg?branch=main)](https://coveralls.io/github/maku85/mongoose-currencies-converter?branch=main)
[![GitHub release](https://img.shields.io/github/release/maku85/mongoose-currencies-converter.svg)](https://github.com/maku85/mongoose-currencies-converter/releases/)
[![GitHub license](https://img.shields.io/github/license/maku85/mongoose-currencies-converter.svg)](https://github.com/maku85/mongoose-currencies-converter/blob/master/LICENSE)

Mongoose currencies converter is a mongoose Schema plugin that can automatically convert currency fields.

## Getting started

1. install the package via npm

```bash
npm install mongoose-currencies-converter
```

2. setup your mongoose model to use the plugin

```javascript
const mongoose = require('mongoose');
const currenciesConverter = require('mongoose-currencies-converter');

const Schema = mongoose.Schema;

const schema = new Schema({
  message: String,
});
schema.plugin(currenciesConverter);
```

## API

### Model.plugin(currenciesConverter, options)

Options are:

- `fields` (**required**) - an array of object declaring fields to convert. A field object has:

  - a **required** currency value field `name`
  - an _optional_ `currency` field name (if not defined conversion consider _EUR_)
  - an _optional_ `date` field name of conversion (if not define conversion consider today)
  - an _optional_ `toCurrency` conversion currency abbreviation (default is _EUR_)

  Example with this configuration:

  ```javascript
  {
    name: 'price',
    currency: 'priceCurrency',
    date: 'createdAt',
    toCurrency: 'USD'
  }
  ```

  we want to convert values inn `price` field, whose currency is defined in `priceCurrency` field, in `USD` considering the date defined in the field `createdAt` as the conversion date.

- `defaultToCurrency` (_optional_) - currency abbreviation, describes currency to convert to for all fields. Default is _EUR_.
- `convertAutomatically` (_optional_) - allows automatic conversion before model save. Disable if you need finer control. Defaults to _true_

### Convert On Demand

You can do on-demand conversion using the `convert` function

```javascript
Product.findOne({ name:'Awesome product', function(err, product) {
  product.price = 99;
  product.currency = 'USD;
  product.convert(function(err, res) {
    console.log("Conversion done!");
  });
});
```

The index method takes 2 arguments:

- `options` (optional) - { fields } - the fields to covert. Defaults convert all fields.
- `callback` - callback function to be invoked when document has been
  converted.

### Restrictions

#### Mongoose

Mongoose is defined as a peer dependency so you need to install it separately.

#### Auto conversion

Mongoose Currencies Converter try to auto convert documents in favor of mongoose's [middleware](http://mongoosejs.com/docs/middleware.html) feature so conversion is fired only using `document.save` but not when using `Model.update` (as a workaround this you can do a `find`, modify field for `this` and then call `this.save()` or call `this.update({}, { $set: { isModified: true } })`).

## TODO List

- [x] Manual conversion
- [x] Support `Model.insertMany`
- [x] Handle errors
- [ ] Add more tests
- [ ] Improve documentation
- [ ] Write example
- [ ] Port to typescript

## Changelog

[View releases](https://github.com/maku85/mongoose-currencies-converter/releases)
