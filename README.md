# Jupyter table of contents (TOC) generation support for Visual Studio Code

  - [1. Summary](#1-summary)
  - [2. Example](#2-example)
  - [3. Features](#3-features)
  - [4. Usage](#4-usage)
    - [4.1. Some details and tips](#41-some-details-and-tips)
  - [5. Supported settings](#5-supported-settings)
  - [6. Known issues](#6-known-issues)
  - [7. About](#7-about)

## 1. Summary 

Generatation of a **table of contents** (TOC) for your Jupyter notebook in [Visual Studio Code](https://code.visualstudio.com/).

Visual Studio Code has "outline" feature to navigate through the jupyter notebook markdown headers. But if this feature is not enough this extension let you to generate interactive TOC directly in jupyter notebook as a separate markdown cell.

## 2. Example

**Generating** table of contents    
<img src="https://raw.githubusercontent.com/xelad0m/vscode-jupyter-toc/main/images/generate.gif" alt="generate" width="700px">

**Removing** table of contents    
<img src="https://raw.githubusercontent.com/xelad0m/vscode-jupyter-toc/main/images/remove.gif" alt="remove" width="700px">

**Configuring** and **updating** table of contents, for example:  
- changing header levels to collect to TOC from 1-6 to 1-2  
- adding numbering  

<img src="https://raw.githubusercontent.com/xelad0m/vscode-jupyter-toc/main/images/config.gif" alt="config" width="700px">

**Navigating** over jupyter notebook  
<img src="https://raw.githubusercontent.com/xelad0m/vscode-jupyter-toc/main/images/navigate.gif" alt="navigate" width="700px">

## 3. Features 

* Generate a table of contents based on markdown titles
* Update an existing TOC when generate it again
* Support not latin headers in Jupyter notebook
* Insert anchors both on your elements of TOC and on headers
    * backward links from document titles to table of contents
* Auto-saving when a TOC is generated 
* Configurable:
    * Levels of headers to numerate and collect to TOC
    * Numbering your table of contents and headers
    * Anchoring you table of contents and headers
    * Display name for the table of contents
    * Save your document when table of contents generated

## 4. Usage

When you open any jupyter notebook all commands are available as **Editor Toolbar menu** items under the overflow menu **(...)**.

<img src="https://raw.githubusercontent.com/xelad0m/vscode-jupyter-toc/main/images/menu.png" alt="menu" width="700px">

Also you can use **comand palette**

* Open any Jupyter notebook
* Open the command palette (`Ctrl+Shift+P`)

Adding new or updating existing table of contents:

* Start typing "**Generate**"
* Choose "**Jupyter: Generate table of contents**"
  * New cell with TOC for notebook will be inserted before current selected cell or existing TOC will be updated

Removing table of contents:

* Start typing "**Remove**"
* Choose "**Jupyter: Remove table of contents**"
  * Notebook cell with table of contents will be removed from notebook. All made formatting of headers such as numbering and anchors will be removed too.

### 4.1. Some details and tips

1. **If you have used versions of this extension less than `v0.2.0`, you may need to call the `Remove table of contents` command before updating/creating a new table of contents, because the format of the table of contents has changed slightly.**
2. Jupyter notebook cell with generated TOC on update replaces with new one so there is no sence to place in it any other text data.
3. Default settings for TOC generation can be changed via `File - Preferences - Settings - Jupyter TOC` section. Or choose this extension in Extension browser (`Ctrl+Shift+X`), than press `Manage` button, choose `Extension settings`.
4. The settings for a particular Jupyter notebook can be overrided by editing the settings directly in the bottom of cell with the table of contents. These settings will have the highest priority for the subsequent generation/update of the table of contents in this document.
5. If you deleted a cell with TOC, but the headings remained with links to the TOC, just use command `Remove table of contents`. It will remove unnecessary links from the headers.

## 5. Supported settings

Key|Expected Values|Default|Description
:---|:---:|:---:|:---
`jupyter.toc.tableOfContentsHeader`|`string`|**Table of contents**|Defines the name for the table of contents.
`jupyter.toc.autoSave`|`boolean`|`false`|Automatically save the notebook after creating, updating, or deleting the table of contents.
`jupyter.toc.numbering`|`boolean`|`false`|Enumerate headers of the jupyther notebook.
`jupyter.toc.flat`|`boolean`|`false`|Flat table of contents without intendentions and list markers. It will better looks when use it with `jupyter.toc.numbering` is enabled.
`jupyter.toc.anchors`|`boolean`|`true`|Add links from the table of contents elements to the headers in the document.
`jupyter.toc.minHeaderLevel`|`1-6`|`1`|Defines the minimum level of the header to be collected in the table of contents.
`jupyter.toc.maxHeaderLevel`|`1-6`|`6`|Defines the maximum level of the header to be collected in the table of contents.
`jupyter.toc.reverseAnchorsStyle`|`["title", "arrow1", "arrow2", "arrow3", "arrow4", "custom"]`|`title`|Styles of links from titles to the table of contents.
`jupyter.toc.customReverseAnchor`|`string`|`&#9757;`|Defines anchor symbol or string to use as link from headers to the TOC. By default its (&#9757;).

You can choose styles of links from titles to the table of contents which looks like:
#### [title](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc)
- (default) Using whole title as reverse link. If some of titles allready have links they will be displayed with `arrow1` style, like (**[Title](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc)** [&#8593;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc)) or (**Title [with](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc) links** [&#8593;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc))
#### arrow1 [&#8593;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc)
- arrow up link at the end of title
#### [&#8593;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc) arrow2
- arrow up link at the begining of title
#### arrow3 [&#9650;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc)
- arrow up link at the end of title
#### [&#9650;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc) arrow4
- arrow up link at the begining of title
#### custom [&#9757;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc)
- user defined symbol or string at the end of title

## 6. Known issues

1. Anchor navigation from TOC to headers and back does not work on github due to peculiarity of rendering of local jupyter notebook links there, but with native `jupyter notebook`/`jupyter-lab` it works well.
2. Due to complicated VS Code notebook editor scrolling functionality newly inserted or updated TOC could scroll not exactly to titles. Reopening of the document solves the problem, links between TOC and titles will work exactly as expected.

## 7. About

This extension is based on [Markdown TOC](https://marketplace.visualstudio.com/items?itemName=joffreykern.markdown-toc) Visual Studio Code extension by [Joffrey Kern](https://github.com/joffreykern/vscode-markdown-toc) and [Kiran Rao](https://github.com/curioustechizen/vscode-markdown-toc).

Special thanks to [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension) manual.

File bugs, feature requests in [GitHub Issues](https://github.com/xelad0m/vscode-jupyter-toc/issues).
