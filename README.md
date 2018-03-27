# Loopback Component translations


The translation functionality shall be implemented as a npm package.
The module shall implement generic translations to loopback based project.

**Features:**

* CRUD for Translations
* Field based translations for entities
* Persiste own translations: An entity shall persist its own translations on Create, Update, Delete.
* Language Fallback ( TBD: entity or filed based or verified) (config/flag)
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
