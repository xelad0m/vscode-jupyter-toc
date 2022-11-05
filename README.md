# Jupyter TOC generation support for Visual Studio Code

## 1. Summary 

Generatation of a **table of contents** (TOC) for your Jupyter notebook in [Visual Studio Code](https://code.visualstudio.com/).

## 2. Features 

* Generate a Table of Content based on markdown titles
* Update an existing TOC when generate it again
* Support not latin headers in Jupyter notebook
* Insert anchors both on your elements of TOC and on headers
* Auto-saving when a TOC is generated 
* Configurable:
    * Levels of headers to numerate and collect to TOC
    * Numbering your table of contents and headers
    * Anchoring you table of contents and headers
    * Save your document when table of content generated

## 3. Example

Without numbering for 1-3 header levels
<p><img src="https://github.com/xelad0m/vscode-jupyter-toc/raw/main/images/nonumbering.png" alt="pic of TOC" width="300px"></p>

With numbering for 1-6 header levels
<p><img src="https://github.com/xelad0m/vscode-jupyter-toc/raw/main/images/numbering.png" alt="pic of numbered TOC" width="300px"></p>

## 4. Usage

* Open any Jupyter notebook
* Open the command palette (`Ctrl+Shift+P`)

Adding new or updating existing Table of contents:

* Type "Generate"
* Choose "Juptyer: Generate TOC for Jupyter notebook"
  * New cell with TOC for notebook will be inserted before current selected cell or existing TOC wil be updated

Removing Table of contents

* Type "Remove"
* Choose "Juptyer: Remove TOC from Jupyter notebook"
  * Notebook cell with table of content will be removed from notebook. All made formatting of headers such as numbering and anchors will be removed too.

### 4.1. Some details and tips

1. Jupyter notebook cell with generated TOC on update replaces with new one so there is no sence to place in it any other text data.
2. Default settings for TOC generation can be changed via `File - Preferences - Settings - Jupyter TOC` section.
3. The settings for a particular Jupyter notebook can be overrided by editing the settings directly in the in the bottom of cell with the table of contents. These settings will have the highest priority for the subsequent generation of the table of contents in this document.
4. **NOTE**: When generating table of contents with numbering and/or anchors the headers in the document cells are being edited. Before generate/update or remove the table of contents from notebook extension clears all headers from numbering and anchors. So if some original titles before first use of extension already had numbering and/or anchors, then such numbering and/or anchors will be lost.

### 4.2. Known issues

1. Anchor navigation from TOC to headers and back does not work on github due to its custom jupyter notebook renderer, but with native `jupyter notebook` it works well

## 5. Supported settings

Key|Expected Values|Default|Description
:---|:---:|:---:|:---
`jupyter.toc.tocHeader`|`string`|**Table of contents**|Defines the name for the table of contents
`jupyter.toc.autoSave`|`boolean`|`false`|Determines whether to automatically save the notebook after creating, updating, or deleting the table of contents.
`jupyter.toc.numbering`|`boolean`|`false`|Determines whether the headers need to be numbered. *Valid only when there is no table of contents in document yet*
`jupyter.toc.anchors`|`boolean`|`true`|Determines whether the table of contents elements should refer to the headings in the document. *Valid only when there is no table of contents in document yet*
`jupyter.toc.minHeaderLevel`|`1-6`|`1`|Defines the minimum level of the header to be included in the table of contents. *Valid only when there is no table of contents in document yet*
`jupyter.toc.maxHeaderLevel`|`1-6`|`6`|Defines the maximum level of the header to be included in the table of contents. *Valid only when there is no table of contents in document yet*

## 6. About

This extension is based on [Markdown TOC](https://marketplace.visualstudio.com/items?itemName=joffreykern.markdown-toc) Visual Studio Code extension by [Joffrey Kern](https://github.com/joffreykern/vscode-markdown-toc) and [Kiran Rao](https://github.com/curioustechizen/vscode-markdown-toc).

Special thanks to [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension) manual.

## 7. Contributing

File bugs, feature requests in [GitHub Issues]().
