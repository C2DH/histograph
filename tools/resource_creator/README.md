# Histograph resource creator

Given a list of documents as text files perform named entity recognition and disambiguation using [C2DH Nerd](https://github.com/C2DH/c2dh_nerd) and prepare documents as a collection of `resources` with associated `entities` in [Histograph create resource format](https://github.com/C2DH/histograph/blob/master/schema/json/api/management/create_resource/payload.json).


# Preparing documents

Organise your documents as a collection of files in a folder, one file per document. This app extracts document metadata from the names of the files. Therefore file names should follow the pattern:

```
<iso_datetime_of_document>_title_<slug_of_the_document>.txt
```

Where:

 * `iso_datetime_of_document` - [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) date and time the document is associated with
 * `slug_of_the_document` - a unique readable ID of the document. It should only contain ASCII letter, numbers, `-` and `_` symbols. The slug is also converted into document title by replacing `_` symbols with spaces. E.g. A slug `once_upon_a_time_page_29` will be converted into a "`once upon a time page 29`" title.

The app will verify that the files follow the this pattern and an error will be raised if some files don't.

# Running

# In virtualenv

```shell
python -m hg_resource_creator <arguments>
```

# In docker

Build container:

```shell
make build
```

Run container:

```shell
docker run --rm -it histograph-resource-creator \
  -v <path_to_documents>:/hg_documents \
  -v <path_to_output_folder>:/hg_output \
  python -m hg_resource_creator \
    --path /hg_documents \
    --outpath /hg_output/mycorpus.jsons \
    <optional_arguments>
```

Arguments are:

 * `--path <folder>` - path to the folder with document files (see `Preparing documents` section). **REQUIRED**
 * `--outpath <resource_jsons_filename>` - path to the file where histograph resources will be saved. **REQUIRED**
 * `--ner-method <method>` - named entity recognition method to be used. See [this file](https://github.com/C2DH/c2dh_nerd/blob/master/c2dh_nerd/context.py#L46-L66) for reference. `spacy_small_multi` is used by default.
 * `--ned-method <method>` - named entity recognition an disambiguation method to be used. See [this file](https://github.com/C2DH/c2dh_nerd/blob/master/c2dh_nerd/context.py#L46-L66) for reference.
 * `--custom-entities-url <url>` - URL of the custom entities CSV file to use if `ner/ned` method chosen above supports it.
 * `--language <code>` - two letter code of the language the documents are written in. `en` by default.
