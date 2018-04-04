# Loopback Component translations


The translation functionality shall be implemented as a npm package.
The module shall implement generic translations to loopback based project.

**Features:**

* CRUD for Translations
* Field based translations for entities
* Persists own translations: An entity shall persist its own translations on Create, Update, Delete.
* Language Fall-back ( TBD: entity or filed based or verified) (config/flag)
* Translation entity on objects (Backward compat); An array with all existing translations for a given entity. (Flag)
* Locales: Map the available locales to the locale service; First draft make this static
* Search

**Behaviour:**

* For each loopback model having translatable properties a translation model in the format loopbackmode_locales shall be created. The translatable properties shall be configured in the translation mode and referenced by configuration in the original model.
* GET Calls are returning the translation in the required language on the model property and in the translations array.
* POST Calls are creating the given entity as well as it’s translations. Translatable properties on the model are dropped.
* PATCH Calls are updating the entity as any given translation
* DELETE Deletes the given entity and its related translations (Delete cascade)
* The fallback is created based on the requests Accept Header

**Usage:**

Install the package `loopback-comonent-translations` as an npm dependency.
A working example can be found in the test directory.

Crate a Loopback Module for the translations
Register all properties you want to translate.

```
{
    "name": "TranslationDummyLocale",
    ...
    "properties": {
        "name": {
            "type": "String",
            "required": true
        },
        "description": {
            "type": "String"
        }
    },
    "relations": {
        "translationDummy": {
            "type": "belongsTo",
            "required": true,
            "model": "TranslationDummy",
            "foreignKey": "translationdummy_id"
        },
        "locale": {
            "type": "belongsTo",
            "required": true,
            "model": "Locale",
            "foreignKey": "locale_id"
        }
    },
    ...
}
```

Add your model to the `model-config.json`

Update your Model you want to use translations.
1. Add the fields to be translated in a array to the options property.
2. Link the Module you crated for the translations as relation `translations`

```
{
    "name": "TranslationDummy",
    ...
    "options": {
        ...
        "translations": [
            "title",
            "description"
        ]

    },
    ...
    "relations": {
        "translations": {
            "type": "hasMany",
            "model": "TranslationDummyLocale",
            "foreignKey": "translationdummy_id"
        }
    },
    ...
}

```

Extend the `LoopbackModelBase` in your model class as follows:


```
const Microservice = require('@joinbox/loopback-microservice');

const { LoopbackModelBase } = Microservice;

class TranslationDummyModel extends LoopbackModelBase {
    constructor({ model }) {
        super({ model });
    }
}

module.exports = function(model) {
    return new TranslationDummyModel({ model });
};
```

Add the package to the `component-config.json`


```
{
  ...
  "@joinbox/loopback-component-translations": {

  }
}

```

Register the HeaderParse middleware to parse the Accept-Language Header.
Add the following to your `middleware.json`
```
"parse": {
  "@joinbox/loopback-component-translations/src/middleware/acceptLanguageHeader#parse": {}
},
```
